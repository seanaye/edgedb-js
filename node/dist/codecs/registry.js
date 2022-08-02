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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodecsRegistry = void 0;
const buffer_1 = require("../primitives/buffer");
const lru_1 = __importDefault(require("../primitives/lru"));
const ifaces_1 = require("./ifaces");
const codecs_1 = require("./codecs");
const consts_1 = require("./consts");
const tuple_1 = require("./tuple");
const numerics = __importStar(require("./numerics"));
const numbers = __importStar(require("./numbers"));
const datecodecs = __importStar(require("./datetime"));
const json_1 = require("./json");
const array_1 = require("./array");
const namedtuple_1 = require("./namedtuple");
const enum_1 = require("./enum");
const object_1 = require("./object");
const set_1 = require("./set");
const range_1 = require("./range");
const utils_1 = require("../utils");
const sparseObject_1 = require("./sparseObject");
const errors_1 = require("../errors");
const CODECS_CACHE_SIZE = 1000;
const CODECS_BUILD_CACHE_SIZE = 200;
const CTYPE_SET = 0;
const CTYPE_SHAPE = 1;
const CTYPE_BASE_SCALAR = 2;
const CTYPE_SCALAR = 3;
const CTYPE_TUPLE = 4;
const CTYPE_NAMEDTUPLE = 5;
const CTYPE_ARRAY = 6;
const CTYPE_ENUM = 7;
const CTYPE_INPUT_SHAPE = 8;
const CTYPE_RANGE = 9;
const DECIMAL_TYPEID = consts_1.KNOWN_TYPENAMES.get("std::decimal");
const INT64_TYPEID = consts_1.KNOWN_TYPENAMES.get("std::int64");
const DATETIME_TYPEID = consts_1.KNOWN_TYPENAMES.get("std::datetime");
const JSON_TYPEID = consts_1.KNOWN_TYPENAMES.get("std::json");
class CodecsRegistry {
    constructor() {
        Object.defineProperty(this, "codecsBuildCache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "codecs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "customScalarCodecs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.codecs = new lru_1.default({ capacity: CODECS_CACHE_SIZE });
        this.codecsBuildCache = new lru_1.default({ capacity: CODECS_BUILD_CACHE_SIZE });
        this.customScalarCodecs = new Map();
    }
    setCustomCodecs({ decimal_string, int64_bigint, datetime_localDatetime, json_string, } = {}) {
        if (decimal_string) {
            this.customScalarCodecs.set(DECIMAL_TYPEID, new numerics.DecimalStringCodec(DECIMAL_TYPEID));
        }
        else {
            this.customScalarCodecs.delete(DECIMAL_TYPEID);
        }
        if (int64_bigint) {
            this.customScalarCodecs.set(INT64_TYPEID, new numbers.Int64BigintCodec(INT64_TYPEID));
        }
        else {
            this.customScalarCodecs.delete(INT64_TYPEID);
        }
        if (datetime_localDatetime) {
            this.customScalarCodecs.set(DATETIME_TYPEID, new datecodecs.LocalDateTimeCodec(DATETIME_TYPEID));
        }
        else {
            this.customScalarCodecs.delete(DATETIME_TYPEID);
        }
        if (json_string) {
            this.customScalarCodecs.set(JSON_TYPEID, new json_1.JSONStringCodec(JSON_TYPEID));
        }
        else {
            this.customScalarCodecs.delete(JSON_TYPEID);
        }
    }
    hasCodec(typeId) {
        if (this.codecs.has(typeId)) {
            return true;
        }
        return typeId === consts_1.NULL_CODEC_ID || typeId === tuple_1.EMPTY_TUPLE_CODEC_ID;
    }
    getCodec(typeId) {
        const codec = this.codecs.get(typeId);
        if (codec != null) {
            return codec;
        }
        if (typeId === tuple_1.EMPTY_TUPLE_CODEC_ID) {
            return tuple_1.EMPTY_TUPLE_CODEC;
        }
        if (typeId === consts_1.NULL_CODEC_ID) {
            return codecs_1.NULL_CODEC;
        }
        return null;
    }
    buildCodec(spec, protocolVersion) {
        const frb = new buffer_1.ReadBuffer(spec);
        const codecsList = [];
        let codec = null;
        while (frb.length) {
            codec = this._buildCodec(frb, codecsList, protocolVersion);
            if (codec == null) {
                continue;
            }
            codecsList.push(codec);
            this.codecs.set(codec.tid, codec);
        }
        if (!codecsList.length) {
            throw new errors_1.InternalClientError("could not build a codec");
        }
        return codecsList[codecsList.length - 1];
    }
    _buildCodec(frb, cl, protocolVersion) {
        var _a;
        const t = frb.readUInt8();
        const tid = frb.readUUID();
        let res = this.codecs.get(tid);
        if (res == null) {
            res = this.codecsBuildCache.get(tid);
        }
        if (res != null) {
            switch (t) {
                case CTYPE_SET: {
                    frb.discard(2);
                    break;
                }
                case CTYPE_SHAPE:
                case CTYPE_INPUT_SHAPE: {
                    const els = frb.readUInt16();
                    for (let i = 0; i < els; i++) {
                        if ((0, utils_1.versionGreaterThanOrEqual)(protocolVersion, [0, 11])) {
                            frb.discard(5);
                        }
                        else {
                            frb.discard(1);
                        }
                        const elm_length = frb.readUInt32();
                        frb.discard(elm_length + 2);
                    }
                    break;
                }
                case CTYPE_BASE_SCALAR: {
                    break;
                }
                case CTYPE_RANGE:
                case CTYPE_SCALAR: {
                    frb.discard(2);
                    break;
                }
                case CTYPE_TUPLE: {
                    const els = frb.readUInt16();
                    frb.discard(2 * els);
                    break;
                }
                case CTYPE_NAMEDTUPLE: {
                    const els = frb.readUInt16();
                    for (let i = 0; i < els; i++) {
                        const elm_length = frb.readUInt32();
                        frb.discard(elm_length + 2);
                    }
                    break;
                }
                case CTYPE_ARRAY: {
                    frb.discard(2);
                    const els = frb.readUInt16();
                    if (els !== 1) {
                        throw new errors_1.ProtocolError("cannot handle arrays with more than one dimension");
                    }
                    frb.discard(4);
                    break;
                }
                case CTYPE_ENUM: {
                    const els = frb.readUInt16();
                    for (let i = 0; i < els; i++) {
                        const elm_length = frb.readUInt32();
                        frb.discard(elm_length);
                    }
                    break;
                }
                default: {
                    if (t >= 0x7f && t <= 0xff) {
                        const ann_length = frb.readUInt32();
                        if (t === 0xff) {
                            const typeName = frb.readBuffer(ann_length).toString("utf8");
                            const codec = (_a = this.codecs.get(tid)) !== null && _a !== void 0 ? _a : this.codecsBuildCache.get(tid);
                            if (codec instanceof ifaces_1.ScalarCodec) {
                                codec.setTypeName(typeName);
                            }
                        }
                        else {
                            frb.discard(ann_length);
                        }
                        return null;
                    }
                    else {
                        throw new errors_1.InternalClientError(`no codec implementation for EdgeDB data class ${t}`);
                    }
                }
            }
            return res;
        }
        switch (t) {
            case CTYPE_BASE_SCALAR: {
                res = this.customScalarCodecs.get(tid);
                if (res != null) {
                    break;
                }
                res = codecs_1.SCALAR_CODECS.get(tid);
                if (!res) {
                    if (consts_1.KNOWN_TYPES.has(tid)) {
                        throw new errors_1.InternalClientError(`no JS codec for ${consts_1.KNOWN_TYPES.get(tid)}`);
                    }
                    throw new errors_1.InternalClientError(`no JS codec for the type with ID ${tid}`);
                }
                if (!(res instanceof ifaces_1.ScalarCodec)) {
                    throw new errors_1.ProtocolError("could not build scalar codec: base scalar is a non-scalar codec");
                }
                break;
            }
            case CTYPE_SHAPE:
            case CTYPE_INPUT_SHAPE: {
                const els = frb.readUInt16();
                const codecs = new Array(els);
                const names = new Array(els);
                const flags = new Array(els);
                const cards = new Array(els);
                for (let i = 0; i < els; i++) {
                    let flag;
                    let card;
                    if ((0, utils_1.versionGreaterThanOrEqual)(protocolVersion, [0, 11])) {
                        flag = frb.readUInt32();
                        card = frb.readUInt8();
                    }
                    else {
                        flag = frb.readUInt8();
                        card = 0;
                    }
                    const strLen = frb.readUInt32();
                    const name = frb.readBuffer(strLen).toString("utf8");
                    const pos = frb.readUInt16();
                    const subCodec = cl[pos];
                    if (subCodec == null) {
                        throw new errors_1.ProtocolError("could not build object codec: missing subcodec");
                    }
                    codecs[i] = subCodec;
                    names[i] = name;
                    flags[i] = flag;
                    cards[i] = card;
                }
                res =
                    t === CTYPE_INPUT_SHAPE
                        ? new sparseObject_1.SparseObjectCodec(tid, codecs, names)
                        : new object_1.ObjectCodec(tid, codecs, names, flags, cards);
                break;
            }
            case CTYPE_SET: {
                const pos = frb.readUInt16();
                const subCodec = cl[pos];
                if (subCodec == null) {
                    throw new errors_1.ProtocolError("could not build set codec: missing subcodec");
                }
                res = new set_1.SetCodec(tid, subCodec);
                break;
            }
            case CTYPE_SCALAR: {
                const pos = frb.readUInt16();
                res = cl[pos];
                if (res == null) {
                    throw new errors_1.ProtocolError("could not build scalar codec: missing a codec for base scalar");
                }
                if (!(res instanceof ifaces_1.ScalarCodec)) {
                    throw new errors_1.ProtocolError("could not build scalar codec: base scalar has a non-scalar codec");
                }
                res = res.derive(tid);
                break;
            }
            case CTYPE_ARRAY: {
                const pos = frb.readUInt16();
                const els = frb.readUInt16();
                if (els !== 1) {
                    throw new errors_1.ProtocolError("cannot handle arrays with more than one dimension");
                }
                const dimLen = frb.readInt32();
                const subCodec = cl[pos];
                if (subCodec == null) {
                    throw new errors_1.ProtocolError("could not build array codec: missing subcodec");
                }
                res = new array_1.ArrayCodec(tid, subCodec, dimLen);
                break;
            }
            case CTYPE_TUPLE: {
                const els = frb.readUInt16();
                if (els === 0) {
                    res = tuple_1.EMPTY_TUPLE_CODEC;
                }
                else {
                    const codecs = new Array(els);
                    for (let i = 0; i < els; i++) {
                        const pos = frb.readUInt16();
                        const subCodec = cl[pos];
                        if (subCodec == null) {
                            throw new errors_1.ProtocolError("could not build tuple codec: missing subcodec");
                        }
                        codecs[i] = subCodec;
                    }
                    res = new tuple_1.TupleCodec(tid, codecs);
                }
                break;
            }
            case CTYPE_NAMEDTUPLE: {
                const els = frb.readUInt16();
                const codecs = new Array(els);
                const names = new Array(els);
                for (let i = 0; i < els; i++) {
                    const strLen = frb.readUInt32();
                    names[i] = frb.readBuffer(strLen).toString("utf8");
                    const pos = frb.readUInt16();
                    const subCodec = cl[pos];
                    if (subCodec == null) {
                        throw new errors_1.ProtocolError("could not build namedtuple codec: missing subcodec");
                    }
                    codecs[i] = subCodec;
                }
                res = new namedtuple_1.NamedTupleCodec(tid, codecs, names);
                break;
            }
            case CTYPE_ENUM: {
                const els = frb.readUInt16();
                for (let i = 0; i < els; i++) {
                    frb.discard(frb.readUInt32());
                }
                res = new enum_1.EnumCodec(tid);
                break;
            }
            case CTYPE_RANGE: {
                const pos = frb.readUInt16();
                const subCodec = cl[pos];
                if (subCodec == null) {
                    throw new errors_1.ProtocolError("could not build range codec: missing subcodec");
                }
                res = new range_1.RangeCodec(tid, subCodec);
                break;
            }
        }
        if (res == null) {
            if (consts_1.KNOWN_TYPES.has(tid)) {
                throw new errors_1.InternalClientError(`could not build a codec for ${consts_1.KNOWN_TYPES.get(tid)} type`);
            }
            else {
                throw new errors_1.InternalClientError(`could not build a codec for ${tid} type`);
            }
        }
        this.codecsBuildCache.set(tid, res);
        return res;
    }
}
exports.CodecsRegistry = CodecsRegistry;
