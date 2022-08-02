"use strict";
/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2019-present MagicStack Inc. and the EdgeDB authors.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.stashPath = exports.parseDuration = exports.ResolvedConnectConfig = exports.parseConnectArguments = exports.validTlsSecurityValues = void 0;
const adapter_node_1 = require("./adapter.node");
const errors = __importStar(require("./errors"));
const credentials_1 = require("./credentials");
const platform = __importStar(require("./platform"));
const datetime_1 = require("./datatypes/datetime");
const datetime_2 = require("./codecs/datetime");
const errors_1 = require("./errors");
exports.validTlsSecurityValues = [
    "insecure",
    "no_host_verification",
    "strict",
    "default",
];
async function parseConnectArguments(opts = {}) {
    var _a;
    const projectDir = await findProjectDir();
    return {
        ...(await parseConnectDsnAndArgs(opts, projectDir)),
        connectTimeout: opts.timeout,
        logging: (_a = opts.logging) !== null && _a !== void 0 ? _a : true,
    };
}
exports.parseConnectArguments = parseConnectArguments;
class ResolvedConnectConfig {
    constructor() {
        Object.defineProperty(this, "_host", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_hostSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_port", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_portSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_database", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_databaseSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_user", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_userSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_password", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_passwordSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_tlsCAData", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_tlsCADataSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_tlsSecurity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_tlsSecuritySource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_waitUntilAvailable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_waitUntilAvailableSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "serverSettings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "_tlsOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.setHost = this.setHost.bind(this);
        this.setPort = this.setPort.bind(this);
        this.setDatabase = this.setDatabase.bind(this);
        this.setUser = this.setUser.bind(this);
        this.setPassword = this.setPassword.bind(this);
        this.setTlsCAData = this.setTlsCAData.bind(this);
        this.setTlsCAFile = this.setTlsCAFile.bind(this);
        this.setTlsSecurity = this.setTlsSecurity.bind(this);
        this.setWaitUntilAvailable = this.setWaitUntilAvailable.bind(this);
    }
    _setParam(param, value, source, validator) {
        if (this[`_${param}`] === null) {
            this[`_${param}Source`] = source;
            if (value !== null) {
                this[`_${param}`] = validator
                    ? validator(value)
                    : value;
                return true;
            }
        }
        return false;
    }
    async _setParamAsync(param, value, source, validator) {
        if (this[`_${param}`] === null) {
            this[`_${param}Source`] = source;
            if (value !== null) {
                this[`_${param}`] = validator
                    ? await validator(value)
                    : value;
                return true;
            }
        }
        return false;
    }
    setHost(host, source) {
        return this._setParam("host", host, source, validateHost);
    }
    setPort(port, source) {
        return this._setParam("port", port, source, parseValidatePort);
    }
    setDatabase(database, source) {
        return this._setParam("database", database, source, (db) => {
            if (db === "") {
                throw new errors_1.InterfaceError(`invalid database name: '${db}'`);
            }
            return db;
        });
    }
    setUser(user, source) {
        return this._setParam("user", user, source, (_user) => {
            if (_user === "") {
                throw new errors_1.InterfaceError(`invalid user name: '${_user}'`);
            }
            return _user;
        });
    }
    setPassword(password, source) {
        return this._setParam("password", password, source);
    }
    setTlsCAData(caData, source) {
        return this._setParam("tlsCAData", caData, source);
    }
    setTlsCAFile(caFile, source) {
        return this._setParamAsync("tlsCAData", caFile, source, caFilePath => (0, adapter_node_1.readFileUtf8)(caFilePath));
    }
    setTlsSecurity(tlsSecurity, source) {
        return this._setParam("tlsSecurity", tlsSecurity, source, (_tlsSecurity) => {
            if (!exports.validTlsSecurityValues.includes(_tlsSecurity)) {
                throw new errors_1.InterfaceError(`invalid 'tlsSecurity' value: '${_tlsSecurity}', ` +
                    `must be one of ${exports.validTlsSecurityValues
                        .map(val => `'${val}'`)
                        .join(", ")}`);
            }
            const clientSecurity = process.env.EDGEDB_CLIENT_SECURITY;
            if (clientSecurity !== undefined) {
                if (!["default", "insecure_dev_mode", "strict"].includes(clientSecurity)) {
                    throw new errors_1.InterfaceError(`invalid EDGEDB_CLIENT_SECURITY value: '${clientSecurity}', ` +
                        `must be one of 'default', 'insecure_dev_mode' or 'strict'`);
                }
                if (clientSecurity === "insecure_dev_mode") {
                    if (_tlsSecurity === "default") {
                        _tlsSecurity = "insecure";
                    }
                }
                else if (clientSecurity === "strict") {
                    if (_tlsSecurity === "insecure" ||
                        _tlsSecurity === "no_host_verification") {
                        throw new errors_1.InterfaceError(`'tlsSecurity' value (${_tlsSecurity}) conflicts with ` +
                            `EDGEDB_CLIENT_SECURITY value (${clientSecurity}), ` +
                            `'tlsSecurity' value cannot be lower than security level ` +
                            `set by EDGEDB_CLIENT_SECURITY`);
                    }
                    _tlsSecurity = "strict";
                }
            }
            return _tlsSecurity;
        });
    }
    setWaitUntilAvailable(duration, source) {
        return this._setParam("waitUntilAvailable", duration, source, parseDuration);
    }
    addServerSettings(settings) {
        this.serverSettings = {
            ...settings,
            ...this.serverSettings,
        };
    }
    get address() {
        var _a, _b;
        return [(_a = this._host) !== null && _a !== void 0 ? _a : "localhost", (_b = this._port) !== null && _b !== void 0 ? _b : 5656];
    }
    get database() {
        var _a;
        return (_a = this._database) !== null && _a !== void 0 ? _a : "edgedb";
    }
    get user() {
        var _a;
        return (_a = this._user) !== null && _a !== void 0 ? _a : "edgedb";
    }
    get password() {
        var _a;
        return (_a = this._password) !== null && _a !== void 0 ? _a : undefined;
    }
    get tlsSecurity() {
        return this._tlsSecurity && this._tlsSecurity !== "default"
            ? this._tlsSecurity
            : this._tlsCAData !== null
                ? "no_host_verification"
                : "strict";
    }
    get tlsOptions() {
        if (this._tlsOptions) {
            return this._tlsOptions;
        }
        const tlsSecurity = this.tlsSecurity;
        this._tlsOptions = {
            ALPNProtocols: ["edgedb-binary"],
            rejectUnauthorized: tlsSecurity !== "insecure",
        };
        if (this._tlsCAData !== null) {
            this._tlsOptions.ca = this._tlsCAData;
        }
        if (tlsSecurity === "no_host_verification") {
            this._tlsOptions.checkServerIdentity = (hostname, cert) => {
                const err = adapter_node_1.tls.checkServerIdentity(hostname, cert);
                if (err === undefined) {
                    return undefined;
                }
                if (err.message.startsWith("Hostname/IP does not match certificate")) {
                    return undefined;
                }
                return err;
            };
        }
        return this._tlsOptions;
    }
    get waitUntilAvailable() {
        var _a;
        return (_a = this._waitUntilAvailable) !== null && _a !== void 0 ? _a : 30000;
    }
    explainConfig() {
        const output = [
            `Parameter          Value                                    Source`,
            `---------          -----                                    ------`,
        ];
        const outputLine = (param, val, rawVal, source) => {
            var _a;
            const isDefault = rawVal === null;
            const maxValLength = 40 - (isDefault ? 10 : 0);
            let value = String(val);
            if (value.length > maxValLength) {
                value = value.slice(0, maxValLength - 3) + "...";
            }
            output.push((_a = param.padEnd(19, " ") +
                (value + (isDefault ? " (default)" : "")).padEnd(42, " ") +
                source) !== null && _a !== void 0 ? _a : "default");
        };
        outputLine("host", this.address[0], this._host, this._hostSource);
        outputLine("port", this.address[1], this._port, this._portSource);
        outputLine("database", this.database, this._database, this._databaseSource);
        outputLine("user", this.user, this._user, this._userSource);
        outputLine("password", this.password &&
            this.password.slice(0, 3).padEnd(this.password.length, "*"), this._password, this._passwordSource);
        outputLine("tlsCAData", this._tlsCAData && this._tlsCAData.replace(/\r\n?|\n/, ""), this._tlsCAData, this._tlsCADataSource);
        outputLine("tlsSecurity", this.tlsSecurity, this._tlsSecurity, this._tlsSecuritySource);
        outputLine("waitUntilAvailable", this.waitUntilAvailable, this._waitUntilAvailable, this._waitUntilAvailableSource);
        return output.join("\n");
    }
}
exports.ResolvedConnectConfig = ResolvedConnectConfig;
function parseValidatePort(port) {
    let parsedPort;
    if (typeof port === "string") {
        if (!/^\d*$/.test(port)) {
            throw new errors_1.InterfaceError(`invalid port: ${port}`);
        }
        parsedPort = parseInt(port, 10);
        if (Number.isNaN(parsedPort)) {
            throw new errors_1.InterfaceError(`invalid port: ${port}`);
        }
    }
    else {
        parsedPort = port;
    }
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        throw new errors_1.InterfaceError(`invalid port: ${port}`);
    }
    return parsedPort;
}
function validateHost(host) {
    if (host.includes("/")) {
        throw new errors_1.InterfaceError(`unix socket paths not supported`);
    }
    if (!host.length || host.includes(",")) {
        throw new errors_1.InterfaceError(`invalid host: '${host}'`);
    }
    return host;
}
function parseDuration(duration) {
    if (typeof duration === "number") {
        if (duration < 0) {
            throw new errors_1.InterfaceError("invalid waitUntilAvailable duration, must be >= 0");
        }
        return duration;
    }
    if (typeof duration === "string") {
        if (duration.startsWith("P")) {
            duration = datetime_1.Duration.from(duration);
        }
        else {
            return (0, datetime_1.parseHumanDurationString)(duration);
        }
    }
    if (duration instanceof datetime_1.Duration) {
        const invalidField = (0, datetime_2.checkValidEdgeDBDuration)(duration);
        if (invalidField) {
            throw new errors_1.InterfaceError(`invalid waitUntilAvailable duration, cannot have a '${invalidField}' value`);
        }
        if (duration.sign < 0) {
            throw new errors_1.InterfaceError("invalid waitUntilAvailable duration, must be >= 0");
        }
        return (duration.milliseconds +
            duration.seconds * 1000 +
            duration.minutes * 60000 +
            duration.hours * 3600000);
    }
    throw new errors_1.InterfaceError(`invalid duration`);
}
exports.parseDuration = parseDuration;
async function parseConnectDsnAndArgs(config, projectDir) {
    const resolvedConfig = new ResolvedConnectConfig();
    let fromEnv = false;
    let fromProject = false;
    const [dsn, instanceName] = config.dsn && /^[a-z]+:\/\//i.test(config.dsn)
        ? [config.dsn, undefined]
        : [undefined, config.dsn];
    let { hasCompoundOptions } = await resolveConfigOptions(resolvedConfig, {
        dsn,
        instanceName,
        credentials: config.credentials,
        credentialsFile: config.credentialsFile,
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        tlsCA: config.tlsCA,
        tlsCAFile: config.tlsCAFile,
        tlsSecurity: config.tlsSecurity,
        serverSettings: config.serverSettings,
        waitUntilAvailable: config.waitUntilAvailable,
    }, {
        dsn: `'dsnOrInstanceName' option (parsed as dsn)`,
        instanceName: `'dsnOrInstanceName' option (parsed as instance name)`,
        credentials: `'credentials' option`,
        credentialsFile: `'credentialsFile' option`,
        host: `'host' option`,
        port: `'port' option`,
        database: `'database' option`,
        user: `'user' option`,
        password: `'password' option`,
        tlsCA: `'tlsCA' option`,
        tlsCAFile: `'tlsCAFile' option`,
        tlsSecurity: `'tlsSecurity' option`,
        serverSettings: `'serverSettings' option`,
        waitUntilAvailable: `'waitUntilAvailable' option`,
    }, `Cannot have more than one of the following connection options: ` +
        `'dsnOrInstanceName', 'credentials', 'credentialsFile' or 'host'/'port'`);
    if (!hasCompoundOptions) {
        let port = process.env.EDGEDB_PORT;
        if (resolvedConfig._port === null && (port === null || port === void 0 ? void 0 : port.startsWith("tcp://"))) {
            console.warn(`EDGEDB_PORT in 'tcp://host:port' format, so will be ignored`);
            port = undefined;
        }
        ({ hasCompoundOptions, anyOptionsUsed: fromEnv } =
            await resolveConfigOptions(resolvedConfig, {
                dsn: process.env.EDGEDB_DSN,
                instanceName: process.env.EDGEDB_INSTANCE,
                credentials: process.env.EDGEDB_CREDENTIALS,
                credentialsFile: process.env.EDGEDB_CREDENTIALS_FILE,
                host: process.env.EDGEDB_HOST,
                port,
                database: process.env.EDGEDB_DATABASE,
                user: process.env.EDGEDB_USER,
                password: process.env.EDGEDB_PASSWORD,
                tlsCA: process.env.EDGEDB_TLS_CA,
                tlsCAFile: process.env.EDGEDB_TLS_CA_FILE,
                tlsSecurity: process.env.EDGEDB_CLIENT_TLS_SECURITY,
                waitUntilAvailable: process.env.EDGEDB_WAIT_UNTIL_AVAILABLE,
            }, {
                dsn: `'EDGEDB_DSN' environment variable`,
                instanceName: `'EDGEDB_INSTANCE' environment variable`,
                credentials: `'EDGEDB_CREDENTIALS' environment variable`,
                credentialsFile: `'EDGEDB_CREDENTIALS_FILE' environment variable`,
                host: `'EDGEDB_HOST' environment variable`,
                port: `'EDGEDB_PORT' environment variable`,
                database: `'EDGEDB_DATABASE' environment variable`,
                user: `'EDGEDB_USER' environment variable`,
                password: `'EDGEDB_PASSWORD' environment variable`,
                tlsCA: `'EDGEDB_TLS_CA' environment variable`,
                tlsCAFile: `'EDGEDB_TLS_CA_FILE' environment variable`,
                tlsSecurity: `'EDGEDB_CLIENT_TLS_SECURITY' environment variable`,
                waitUntilAvailable: `'EDGEDB_WAIT_UNTIL_AVAILABLE' environment variable`,
            }, `Cannot have more than one of the following connection environment variables: ` +
                `'EDGEDB_DSN', 'EDGEDB_INSTANCE', 'EDGEDB_CREDENTIALS', ` +
                `'EDGEDB_CREDENTIALS_FILE' or 'EDGEDB_HOST'`));
    }
    if (!hasCompoundOptions) {
        if (!projectDir) {
            throw new errors.ClientConnectionError("no 'edgedb.toml' found and no connection options specified" +
                " either via arguments to `connect()` API or via environment" +
                " variables EDGEDB_HOST, EDGEDB_INSTANCE, EDGEDB_DSN, " +
                "EDGEDB_CREDENTIALS or EDGEDB_CREDENTIALS_FILE");
        }
        const stashDir = await stashPath(projectDir);
        const instName = await (0, adapter_node_1.readFileUtf8)(adapter_node_1.path.join(stashDir, "instance-name"))
            .then(name => name.trim())
            .catch(() => null);
        if (instName !== null) {
            await resolveConfigOptions(resolvedConfig, { instanceName: instName }, { instanceName: `project linked instance ('${instName}')` }, "");
            fromProject = true;
        }
        else {
            throw new errors.ClientConnectionError("Found 'edgedb.toml' but the project is not initialized. " +
                "Run `edgedb project init`.");
        }
    }
    resolvedConfig.setTlsSecurity("default", "default");
    return {
        connectionParams: resolvedConfig,
        inProject: !!projectDir,
        fromEnv,
        fromProject,
    };
}
async function stashPath(projectDir) {
    let projectPath = await adapter_node_1.fs.realpath(projectDir);
    if (platform.isWindows && !projectPath.startsWith("\\\\")) {
        projectPath = "\\\\?\\" + projectPath;
    }
    const hash = adapter_node_1.crypto.createHash("sha1").update(projectPath).digest("hex");
    const baseName = adapter_node_1.path.basename(projectPath);
    const dirName = baseName + "-" + hash;
    return platform.searchConfigDir("projects", dirName);
}
exports.stashPath = stashPath;
const projectDirCache = new Map();
async function findProjectDir() {
    const workingDir = process.cwd();
    if (projectDirCache.has(workingDir)) {
        return projectDirCache.get(workingDir);
    }
    let dir = workingDir;
    const cwdDev = (await adapter_node_1.fs.stat(dir)).dev;
    while (true) {
        if (await (0, adapter_node_1.exists)(adapter_node_1.path.join(dir, "edgedb.toml"))) {
            projectDirCache.set(workingDir, dir);
            return dir;
        }
        const parentDir = adapter_node_1.path.join(dir, "..");
        if (parentDir === dir || (await adapter_node_1.fs.stat(parentDir)).dev !== cwdDev) {
            projectDirCache.set(workingDir, null);
            return null;
        }
        dir = parentDir;
    }
}
async function resolveConfigOptions(resolvedConfig, config, sources, compoundParamsError) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    let anyOptionsUsed = false;
    if (config.tlsCA != null && config.tlsCAFile != null) {
        throw new errors_1.InterfaceError(`Cannot specify both ${sources.tlsCA} and ${sources.tlsCAFile}`);
    }
    anyOptionsUsed =
        resolvedConfig.setDatabase((_a = config.database) !== null && _a !== void 0 ? _a : null, sources.database) ||
            anyOptionsUsed;
    anyOptionsUsed =
        resolvedConfig.setUser((_b = config.user) !== null && _b !== void 0 ? _b : null, sources.user) ||
            anyOptionsUsed;
    anyOptionsUsed =
        resolvedConfig.setPassword((_c = config.password) !== null && _c !== void 0 ? _c : null, sources.password) ||
            anyOptionsUsed;
    anyOptionsUsed =
        resolvedConfig.setTlsCAData((_d = config.tlsCA) !== null && _d !== void 0 ? _d : null, sources.tlsCA) ||
            anyOptionsUsed;
    anyOptionsUsed =
        (await resolvedConfig.setTlsCAFile((_e = config.tlsCAFile) !== null && _e !== void 0 ? _e : null, sources.tlsCAFile)) || anyOptionsUsed;
    anyOptionsUsed =
        resolvedConfig.setTlsSecurity((_f = config.tlsSecurity) !== null && _f !== void 0 ? _f : null, sources.tlsSecurity) || anyOptionsUsed;
    anyOptionsUsed =
        resolvedConfig.setWaitUntilAvailable((_g = config.waitUntilAvailable) !== null && _g !== void 0 ? _g : null, sources.waitUntilAvailable) || anyOptionsUsed;
    resolvedConfig.addServerSettings((_h = config.serverSettings) !== null && _h !== void 0 ? _h : {});
    const compoundParamsCount = [
        config.dsn,
        config.instanceName,
        config.credentials,
        config.credentialsFile,
        (_j = config.host) !== null && _j !== void 0 ? _j : config.port,
    ].filter(param => param !== undefined).length;
    if (compoundParamsCount > 1) {
        throw new errors_1.InterfaceError(compoundParamsError);
    }
    if (compoundParamsCount === 1) {
        if (config.dsn !== undefined ||
            config.host !== undefined ||
            config.port !== undefined) {
            let dsn = config.dsn;
            if (dsn === undefined) {
                if (config.port !== undefined) {
                    resolvedConfig.setPort(config.port, sources.port);
                }
                const host = config.host != null ? validateHost(config.host) : "";
                dsn = `edgedb://${host.includes(":") ? `[${encodeURI(host)}]` : host}`;
            }
            await parseDSNIntoConfig(dsn, resolvedConfig, config.dsn
                ? sources.dsn
                : config.host !== undefined
                    ? sources.host
                    : sources.port);
        }
        else {
            let creds;
            let source;
            if (config.credentials != null) {
                creds = (0, credentials_1.validateCredentials)(JSON.parse(config.credentials));
                source = sources.credentials;
            }
            else {
                let credentialsFile = config.credentialsFile;
                if (credentialsFile === undefined) {
                    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(config.instanceName)) {
                        throw new errors_1.InterfaceError(`invalid DSN or instance name: '${config.instanceName}'`);
                    }
                    credentialsFile = await (0, credentials_1.getCredentialsPath)(config.instanceName);
                    source = sources.instanceName;
                }
                else {
                    source = sources.credentialsFile;
                }
                creds = await (0, credentials_1.readCredentialsFile)(credentialsFile);
            }
            resolvedConfig.setHost((_k = creds.host) !== null && _k !== void 0 ? _k : null, source);
            resolvedConfig.setPort((_l = creds.port) !== null && _l !== void 0 ? _l : null, source);
            resolvedConfig.setDatabase((_m = creds.database) !== null && _m !== void 0 ? _m : null, source);
            resolvedConfig.setUser((_o = creds.user) !== null && _o !== void 0 ? _o : null, source);
            resolvedConfig.setPassword((_p = creds.password) !== null && _p !== void 0 ? _p : null, source);
            resolvedConfig.setTlsCAData((_q = creds.tlsCAData) !== null && _q !== void 0 ? _q : null, source);
            resolvedConfig.setTlsSecurity((_r = creds.tlsSecurity) !== null && _r !== void 0 ? _r : null, source);
        }
        return { hasCompoundOptions: true, anyOptionsUsed: true };
    }
    return { hasCompoundOptions: false, anyOptionsUsed };
}
async function parseDSNIntoConfig(_dsnString, config, source) {
    let dsnString = _dsnString;
    let regexHostname = null;
    let zoneId = "";
    const regexResult = /\[(.*?)(%25.+?)\]/.exec(_dsnString);
    if (regexResult) {
        regexHostname = regexResult[1];
        zoneId = decodeURI(regexResult[2]);
        dsnString =
            dsnString.slice(0, regexResult.index + regexHostname.length + 1) +
                dsnString.slice(regexResult.index + regexHostname.length + regexResult[2].length + 1);
    }
    let parsed;
    try {
        parsed = new URL(dsnString);
        if (regexHostname !== null && parsed.hostname !== `[${regexHostname}]`) {
            throw new Error();
        }
    }
    catch (_) {
        throw new errors_1.InterfaceError(`invalid DSN or instance name: '${_dsnString}'`);
    }
    if (parsed.protocol !== "edgedb:") {
        throw new errors_1.InterfaceError(`invalid DSN: scheme is expected to be ` +
            `'edgedb', got '${parsed.protocol.slice(0, -1)}'`);
    }
    const searchParams = new Map();
    for (const [key, value] of parsed.searchParams) {
        if (searchParams.has(key)) {
            throw new errors_1.InterfaceError(`invalid DSN: duplicate query parameter '${key}'`);
        }
        searchParams.set(key, value);
    }
    async function handleDSNPart(paramName, value, currentValue, setter, formatter = val => val) {
        var _a, _b;
        if ([
            value || null,
            searchParams.get(paramName),
            searchParams.get(`${paramName}_env`),
            searchParams.get(`${paramName}_file`),
        ].filter(param => param != null).length > 1) {
            throw new errors_1.InterfaceError(`invalid DSN: more than one of ${value !== null ? `'${paramName}', ` : ""}'?${paramName}=', ` +
                `'?${paramName}_env=' or '?${paramName}_file=' was specified ${dsnString}`);
        }
        if (currentValue === null) {
            let param = value || ((_a = searchParams.get(paramName)) !== null && _a !== void 0 ? _a : null);
            let paramSource = source;
            if (param === null) {
                const env = searchParams.get(`${paramName}_env`);
                if (env != null) {
                    param = (_b = process.env[env]) !== null && _b !== void 0 ? _b : null;
                    if (param === null) {
                        throw new errors_1.InterfaceError(`'${paramName}_env' environment variable '${env}' doesn't exist`);
                    }
                    paramSource += ` (${paramName}_env: ${env})`;
                }
            }
            if (param === null) {
                const file = searchParams.get(`${paramName}_file`);
                if (file != null) {
                    param = await (0, adapter_node_1.readFileUtf8)(file);
                    paramSource += ` (${paramName}_file: ${file})`;
                }
            }
            param = param !== null ? formatter(param) : null;
            await setter(param, paramSource);
        }
        searchParams.delete(paramName);
        searchParams.delete(`${paramName}_env`);
        searchParams.delete(`${paramName}_file`);
    }
    const hostname = /^\[.*\]$/.test(parsed.hostname)
        ? parsed.hostname.slice(1, -1) + zoneId
        : parsed.hostname;
    await handleDSNPart("host", hostname, config._host, config.setHost);
    await handleDSNPart("port", parsed.port, config._port, config.setPort);
    const stripLeadingSlash = (str) => str.replace(/^\//, "");
    await handleDSNPart("database", stripLeadingSlash(parsed.pathname), config._database, config.setDatabase, stripLeadingSlash);
    await handleDSNPart("user", parsed.username, config._user, config.setUser);
    await handleDSNPart("password", parsed.password, config._password, config.setPassword);
    await handleDSNPart("tls_ca", null, config._tlsCAData, config.setTlsCAData);
    await handleDSNPart("tls_security", null, config._tlsSecurity, config.setTlsSecurity);
    await handleDSNPart("wait_until_available", null, config._waitUntilAvailable, config.setWaitUntilAvailable);
    const serverSettings = {};
    for (const [key, value] of searchParams) {
        serverSettings[key] = value;
    }
    config.addServerSettings(serverSettings);
}
