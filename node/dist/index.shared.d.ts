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
export { LocalDateTime, LocalDate, LocalTime, Duration, RelativeDuration, DateDuration, } from "./datatypes/datetime";
export { ConfigMemory } from "./datatypes/memory";
export { Range } from "./datatypes/range";
export type { Executor } from "./ifaces";
export * from "./errors";
import * as codecs from "./codecs/ifaces";
import * as reg from "./codecs/registry";
import * as buf from "./primitives/buffer";
export declare const _CodecsRegistry: typeof reg.CodecsRegistry;
export declare const _ReadBuffer: typeof buf.ReadBuffer;
export declare type _ICodec = codecs.ICodec;
import { plugJSBI } from "./primitives/bigint";
export declare const _plugJSBI: typeof plugJSBI;
export declare const _edgedbJsVersion = "0.21.2";
