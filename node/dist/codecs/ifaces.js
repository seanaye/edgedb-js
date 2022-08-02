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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScalarCodec = exports.Codec = void 0;
const consts_1 = require("./consts");
class Codec {
    constructor(tid) {
        Object.defineProperty(this, "tid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tidBuffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.tid = tid;
        this.tidBuffer = Buffer.from(tid, "hex");
    }
    getKnownTypeName() {
        return "anytype";
    }
}
exports.Codec = Codec;
class ScalarCodec extends Codec {
    constructor(tid, derivedFromTid = null) {
        super(tid);
        Object.defineProperty(this, "derivedFromTid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "typeName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.derivedFromTid = derivedFromTid;
    }
    setTypeName(typeName) {
        this.typeName = typeName;
    }
    derive(tid) {
        const self = this.constructor;
        return new self(tid, this.tid);
    }
    getSubcodecs() {
        return [];
    }
    getKind() {
        return "scalar";
    }
    getKnownTypeName() {
        if (this.typeName) {
            return this.typeName;
        }
        if (this.derivedFromTid) {
            return consts_1.KNOWN_TYPES.get(this.derivedFromTid);
        }
        return consts_1.KNOWN_TYPES.get(this.tid) || "anytype";
    }
}
exports.ScalarCodec = ScalarCodec;
