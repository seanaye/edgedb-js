"use strict";
/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2020-present MagicStack Inc. and the EdgeDB authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.Client = exports.ClientConnectionHolder = void 0;
const registry_1 = require("./codecs/registry");
const conUtils_1 = require("./conUtils");
const errors = __importStar(require("./errors"));
const ifaces_1 = require("./ifaces");
const options_1 = require("./options");
const event_1 = __importDefault(require("./primitives/event"));
const queues_1 = require("./primitives/queues");
const retry_1 = require("./retry");
const transaction_1 = require("./transaction");
const utils_1 = require("./utils");
class ClientConnectionHolder {
    constructor(pool) {
        Object.defineProperty(this, "_pool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_connection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_inUse", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._pool = pool;
        this._connection = null;
        this._options = null;
        this._inUse = null;
    }
    get options() {
        var _a;
        return (_a = this._options) !== null && _a !== void 0 ? _a : options_1.Options.defaults();
    }
    async _getConnection() {
        if (!this._connection || this._connection.isClosed()) {
            this._connection = await this._pool.getNewConnection();
        }
        return this._connection;
    }
    get connectionOpen() {
        return this._connection !== null && !this._connection.isClosed();
    }
    async acquire(options) {
        if (this._inUse) {
            throw new errors.InternalClientError("ClientConnectionHolder cannot be acquired, already in use");
        }
        this._options = options;
        this._inUse = new event_1.default();
        return this;
    }
    async release() {
        var _a;
        if (this._inUse === null) {
            throw new errors.ClientError("ClientConnectionHolder.release() called on " +
                "a free connection holder");
        }
        this._options = null;
        await ((_a = this._connection) === null || _a === void 0 ? void 0 : _a.resetState());
        if (!this._inUse.done) {
            this._inUse.set();
        }
        this._inUse = null;
        this._pool.enqueue(this);
    }
    async _waitUntilReleasedAndClose() {
        var _a;
        if (this._inUse) {
            await this._inUse.wait();
        }
        await ((_a = this._connection) === null || _a === void 0 ? void 0 : _a.close());
    }
    terminate() {
        var _a;
        (_a = this._connection) === null || _a === void 0 ? void 0 : _a.close();
    }
    async transaction(action) {
        let result;
        for (let iteration = 0; true; ++iteration) {
            const transaction = await transaction_1.Transaction._startTransaction(this);
            let commitFailed = false;
            try {
                result = await Promise.race([
                    action(transaction),
                    transaction._waitForConnAbort(),
                ]);
                try {
                    await transaction._commit();
                }
                catch (err) {
                    commitFailed = true;
                    throw err;
                }
            }
            catch (err) {
                try {
                    if (!commitFailed) {
                        await transaction._rollback();
                    }
                }
                catch (rollback_err) {
                    if (!(rollback_err instanceof errors.EdgeDBError)) {
                        throw rollback_err;
                    }
                }
                if (err instanceof errors.EdgeDBError &&
                    err.hasTag(errors.SHOULD_RETRY) &&
                    !(commitFailed && err instanceof errors.ClientConnectionError)) {
                    const rule = this.options.retryOptions.getRuleForException(err);
                    if (iteration + 1 >= rule.attempts) {
                        throw err;
                    }
                    await (0, utils_1.sleep)(rule.backoff(iteration + 1));
                    continue;
                }
                throw err;
            }
            return result;
        }
    }
    async retryingFetch(query, args, outputFormat, expectedCardinality) {
        let result;
        for (let iteration = 0; true; ++iteration) {
            const conn = await this._getConnection();
            try {
                result = await conn.fetch(query, args, outputFormat, expectedCardinality, this.options.session);
            }
            catch (err) {
                if (err instanceof errors.EdgeDBError &&
                    err.hasTag(errors.SHOULD_RETRY) &&
                    (conn.getQueryCapabilities(query, outputFormat, expectedCardinality) === 0 ||
                        err instanceof errors.TransactionConflictError)) {
                    const rule = this.options.retryOptions.getRuleForException(err);
                    if (iteration + 1 >= rule.attempts) {
                        throw err;
                    }
                    await (0, utils_1.sleep)(rule.backoff(iteration + 1));
                    continue;
                }
                throw err;
            }
            return result;
        }
    }
    async execute(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.NONE, ifaces_1.Cardinality.NO_RESULT);
    }
    async query(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.BINARY, ifaces_1.Cardinality.MANY);
    }
    async queryJSON(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.JSON, ifaces_1.Cardinality.MANY);
    }
    async querySingle(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.BINARY, ifaces_1.Cardinality.AT_MOST_ONE);
    }
    async querySingleJSON(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.JSON, ifaces_1.Cardinality.AT_MOST_ONE);
    }
    async queryRequiredSingle(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.BINARY, ifaces_1.Cardinality.ONE);
    }
    async queryRequiredSingleJSON(query, args) {
        return this.retryingFetch(query, args, ifaces_1.OutputFormat.JSON, ifaces_1.Cardinality.ONE);
    }
}
exports.ClientConnectionHolder = ClientConnectionHolder;
class ClientPool {
    constructor(dsn, options = {}) {
        var _a;
        Object.defineProperty(this, "_closing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_holders", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_userConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_suggestedConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_connectConfig", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_codecsRegistry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "__normalizedConnectConfig", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.validateClientOptions(options);
        this._codecsRegistry = new registry_1.CodecsRegistry();
        this._queue = new queues_1.LifoQueue();
        this._holders = [];
        this._userConcurrency = (_a = options.concurrency) !== null && _a !== void 0 ? _a : null;
        this._suggestedConcurrency = null;
        this._closing = null;
        this._connectConfig = { ...options, ...(dsn !== undefined ? { dsn } : {}) };
        this._resizeHolderPool();
    }
    validateClientOptions(opts) {
        if (opts.concurrency != null &&
            (typeof opts.concurrency !== "number" ||
                !Number.isInteger(opts.concurrency) ||
                opts.concurrency < 0)) {
            throw new errors.InterfaceError(`invalid 'concurrency' value: ` +
                `expected integer greater than 0 (got ${JSON.stringify(opts.concurrency)})`);
        }
    }
    _getStats() {
        return {
            queueLength: this._queue.pending,
            openConnections: this._holders.filter(holder => holder.connectionOpen)
                .length,
        };
    }
    async ensureConnected() {
        if (this._closing) {
            throw new errors.InterfaceError(this._closing.done ? "The client is closed" : "The client is closing");
        }
        if (this._getStats().openConnections > 0) {
            return;
        }
        const connHolder = await this._queue.get();
        try {
            await connHolder._getConnection();
        }
        finally {
            this._queue.push(connHolder);
        }
    }
    get _concurrency() {
        var _a, _b;
        return (_b = (_a = this._userConcurrency) !== null && _a !== void 0 ? _a : this._suggestedConcurrency) !== null && _b !== void 0 ? _b : 1;
    }
    _resizeHolderPool() {
        const holdersDiff = this._concurrency - this._holders.length;
        if (holdersDiff > 0) {
            for (let i = 0; i < holdersDiff; i++) {
                const connectionHolder = new ClientConnectionHolder(this);
                this._holders.push(connectionHolder);
                this._queue.push(connectionHolder);
            }
        }
        else if (holdersDiff < 0) {
        }
    }
    _getNormalizedConnectConfig() {
        var _a;
        return ((_a = this.__normalizedConnectConfig) !== null && _a !== void 0 ? _a : (this.__normalizedConnectConfig = (0, conUtils_1.parseConnectArguments)(this._connectConfig)));
    }
    async getNewConnection() {
        var _a;
        if ((_a = this._closing) === null || _a === void 0 ? void 0 : _a.done) {
            throw new errors.InterfaceError("The client is closed");
        }
        const config = await this._getNormalizedConnectConfig();
        const connection = await (0, retry_1.retryingConnect)(config, this._codecsRegistry);
        const suggestedConcurrency = connection.serverSettings.suggested_pool_concurrency;
        if (suggestedConcurrency &&
            suggestedConcurrency !== this._suggestedConcurrency) {
            this._suggestedConcurrency = suggestedConcurrency;
            this._resizeHolderPool();
        }
        return connection;
    }
    async acquireHolder(options) {
        if (this._closing) {
            throw new errors.InterfaceError(this._closing.done ? "The client is closed" : "The client is closing");
        }
        const connectionHolder = await this._queue.get();
        try {
            return await connectionHolder.acquire(options);
        }
        catch (error) {
            this._queue.push(connectionHolder);
            throw error;
        }
    }
    enqueue(holder) {
        this._queue.push(holder);
    }
    async close() {
        if (this._closing) {
            return await this._closing.wait();
        }
        this._closing = new event_1.default();
        this._queue.cancelAllPending(new errors.InterfaceError(`The client is closing`));
        const warningTimeoutId = setTimeout(() => {
            console.warn("Client.close() is taking over 60 seconds to complete. " +
                "Check if you have any unreleased connections left.");
        }, 60e3);
        try {
            await Promise.all(this._holders.map(connectionHolder => connectionHolder._waitUntilReleasedAndClose()));
        }
        catch (err) {
            this._terminate();
            this._closing.setError(err);
            throw err;
        }
        finally {
            clearTimeout(warningTimeoutId);
        }
        this._closing.set();
    }
    _terminate() {
        for (const connectionHolder of this._holders) {
            connectionHolder.terminate();
        }
    }
    terminate() {
        var _a;
        if ((_a = this._closing) === null || _a === void 0 ? void 0 : _a.done) {
            return;
        }
        this._queue.cancelAllPending(new errors.InterfaceError(`The client is closed`));
        this._terminate();
        if (!this._closing) {
            this._closing = new event_1.default();
            this._closing.set();
        }
    }
    isClosed() {
        return !!this._closing;
    }
}
class Client {
    constructor(pool, options) {
        Object.defineProperty(this, "pool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.pool = pool;
        this.options = options;
    }
    static create(dsn, options) {
        return new Client(new ClientPool(dsn, options !== null && options !== void 0 ? options : {}), options_1.Options.defaults());
    }
    withTransactionOptions(opts) {
        return new Client(this.pool, this.options.withTransactionOptions(opts));
    }
    withRetryOptions(opts) {
        return new Client(this.pool, this.options.withRetryOptions(opts));
    }
    withSession(session) {
        return new Client(this.pool, this.options.withSession(session));
    }
    withModuleAliases(aliases) {
        return new Client(this.pool, this.options.withSession(this.options.session.withModuleAliases(aliases)));
    }
    withConfig(config) {
        return new Client(this.pool, this.options.withSession(this.options.session.withConfig(config)));
    }
    withGlobals(globals) {
        return new Client(this.pool, this.options.withSession(this.options.session.withGlobals(globals)));
    }
    async ensureConnected() {
        await this.pool.ensureConnected();
        return this;
    }
    isClosed() {
        return this.pool.isClosed();
    }
    async close() {
        await this.pool.close();
    }
    terminate() {
        this.pool.terminate();
    }
    async transaction(action) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.transaction(action);
        }
        finally {
            await holder.release();
        }
    }
    async execute(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.execute(query, args);
        }
        finally {
            await holder.release();
        }
    }
    async query(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.query(query, args);
        }
        finally {
            await holder.release();
        }
    }
    async queryJSON(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.queryJSON(query, args);
        }
        finally {
            await holder.release();
        }
    }
    async querySingle(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.querySingle(query, args);
        }
        finally {
            await holder.release();
        }
    }
    async querySingleJSON(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.querySingleJSON(query, args);
        }
        finally {
            await holder.release();
        }
    }
    async queryRequiredSingle(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.queryRequiredSingle(query, args);
        }
        finally {
            await holder.release();
        }
    }
    async queryRequiredSingleJSON(query, args) {
        const holder = await this.pool.acquireHolder(this.options);
        try {
            return await holder.queryRequiredSingleJSON(query, args);
        }
        finally {
            await holder.release();
        }
    }
}
exports.Client = Client;
function createClient(options) {
    if (typeof options === "string") {
        return Client.create(options);
    }
    else {
        return Client.create(undefined, options);
    }
}
exports.createClient = createClient;
