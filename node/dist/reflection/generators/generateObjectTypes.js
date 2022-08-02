"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateObjectTypes = exports.getStringRepresentation = void 0;
const builders_1 = require("../builders");
const enums_1 = require("../enums");
const genutil_1 = require("../util/genutil");
const singletonObjectTypes = new Set(["std::FreeObject"]);
const getStringRepresentation = (type, params) => {
    var _a, _b, _c;
    const suffix = params.castSuffix || `λICastableTo`;
    if (type.name === "anytype") {
        return {
            staticType: (0, genutil_1.frag) `${(_a = params.anytype) !== null && _a !== void 0 ? _a : `$.BaseType`}`,
            runtimeType: [],
        };
    }
    if (type.name === "anytuple") {
        return {
            staticType: [`$.AnyTupleType`],
            runtimeType: [],
        };
    }
    if (type.name === "std::anypoint") {
        return {
            staticType: (0, genutil_1.frag) `${(_b = params.anytype) !== null && _b !== void 0 ? _b : (0, genutil_1.getRef)("std::anypoint")}`,
            runtimeType: [],
        };
    }
    if (type.name === "std::anyenum") {
        return {
            staticType: [`$.EnumType`],
            runtimeType: [],
        };
    }
    const { types, casts } = params;
    if (type.kind === "object") {
        if (type.name === "std::BaseObject") {
            return {
                staticType: ["$.ObjectType"],
                runtimeType: [(0, genutil_1.getRef)(type.name)],
            };
        }
        return {
            staticType: [(0, genutil_1.getRef)(type.name)],
            runtimeType: [(0, genutil_1.getRef)(type.name)],
        };
    }
    else if (type.kind === "scalar") {
        return {
            staticType: [(0, genutil_1.getRef)(type.name), ((_c = casts === null || casts === void 0 ? void 0 : casts[type.id]) === null || _c === void 0 ? void 0 : _c.length) ? suffix : ""],
            runtimeType: [(0, genutil_1.getRef)(type.name)],
        };
    }
    else if (type.kind === "array") {
        return {
            staticType: (0, genutil_1.frag) `$.ArrayType<${(0, exports.getStringRepresentation)(types.get(type.array_element_id), params)
                .staticType}>`,
            runtimeType: (0, genutil_1.frag) `$.ArrayType(${(0, exports.getStringRepresentation)(types.get(type.array_element_id), params)
                .runtimeType})`,
        };
    }
    else if (type.kind === "tuple") {
        const isNamed = type.tuple_elements[0].name !== "0";
        if (isNamed) {
            const itemsStatic = (0, genutil_1.joinFrags)(type.tuple_elements.map(it => (0, genutil_1.frag) `${it.name}: ${(0, exports.getStringRepresentation)(types.get(it.target_id), params)
                .staticType}`), ", ");
            const itemsRuntime = (0, genutil_1.joinFrags)(type.tuple_elements.map(it => (0, genutil_1.frag) `${it.name}: ${(0, exports.getStringRepresentation)(types.get(it.target_id), params)
                .runtimeType}`), ", ");
            return {
                staticType: (0, genutil_1.frag) `$.NamedTupleType<{${itemsStatic}}>`,
                runtimeType: (0, genutil_1.frag) `$.NamedTupleType({${itemsRuntime}})`,
            };
        }
        else {
            const items = type.tuple_elements
                .map(it => it.target_id)
                .map(id => types.get(id))
                .map(el => (0, exports.getStringRepresentation)(el, params));
            return {
                staticType: (0, genutil_1.frag) `$.TupleType<[${(0, genutil_1.joinFrags)(items.map(it => it.staticType), ", ")}]>`,
                runtimeType: (0, genutil_1.frag) `$.TupleType([${(0, genutil_1.joinFrags)(items.map(it => it.runtimeType), ", ")}])`,
            };
        }
    }
    else if (type.kind === "range") {
        return {
            staticType: (0, genutil_1.frag) `$.RangeType<${(0, exports.getStringRepresentation)(types.get(type.range_element_id), params)
                .staticType}>`,
            runtimeType: (0, genutil_1.frag) `$.RangeType(${(0, exports.getStringRepresentation)(types.get(type.range_element_id), params)
                .runtimeType})`,
        };
    }
    else {
        throw new Error("Invalid type");
    }
};
exports.getStringRepresentation = getStringRepresentation;
const generateObjectTypes = (params) => {
    var _a;
    const { dir, types } = params;
    const plainTypesCode = dir.getPath("types");
    const edgedb = params.isDeno
        ? "https://deno.land/x/edgedb/mod.ts"
        : "edgedb";
    plainTypesCode.addImportStar("edgedb", edgedb, {
        typeOnly: true,
    });
    const plainTypeModules = new Map();
    const getPlainTypeModule = (typeName) => {
        const { mod: tMod, name: tName } = (0, genutil_1.splitName)(typeName);
        if (!plainTypeModules.has(tMod)) {
            plainTypeModules.set(tMod, {
                internalName: (0, genutil_1.makePlainIdent)(tMod),
                buf: new builders_1.CodeBuffer(),
                types: new Map(),
            });
        }
        return { tMod, tName, module: plainTypeModules.get(tMod) };
    };
    const _getTypeName = (mod) => (typeName, withModule = false) => {
        const { tMod, tName, module } = getPlainTypeModule(typeName);
        return (((mod !== tMod || withModule) && tMod !== "default"
            ? `${module.internalName}.`
            : "") + `${(0, genutil_1.makePlainIdent)(tName)}`);
    };
    for (const type of types.values()) {
        if (type.kind !== "object") {
            if (type.kind === "scalar" && ((_a = type.enum_values) === null || _a === void 0 ? void 0 : _a.length)) {
                const { mod: enumMod, name: enumName } = (0, genutil_1.splitName)(type.name);
                const getEnumTypeName = _getTypeName(enumMod);
                const { module } = getPlainTypeModule(type.name);
                module.types.set(enumName, getEnumTypeName(type.name, true));
                module.buf.writeln([(0, builders_1.t) `export enum ${getEnumTypeName(type.name)} {`], ...type.enum_values.map(val => [
                    (0, builders_1.t) `  ${(0, genutil_1.makePlainIdent)(val)} = ${(0, genutil_1.quote)(val)},`,
                ]), [(0, builders_1.t) `}`]);
            }
            continue;
        }
        if ((type.union_of && type.union_of.length) ||
            (type.intersection_of && type.intersection_of.length)) {
            continue;
        }
        const { mod, name } = (0, genutil_1.splitName)(type.name);
        const body = dir.getModule(mod, params.isDeno);
        body.registerRef(type.name, type.id);
        const ref = (0, genutil_1.getRef)(type.name);
        const getTypeName = _getTypeName(mod);
        const getTSType = (pointer) => {
            const targetType = types.get(pointer.target_id);
            if (pointer.kind === "link") {
                return getTypeName(targetType.name);
            }
            else {
                return (0, genutil_1.toTSScalarType)(targetType, types, {
                    getEnumRef: enumType => getTypeName(enumType.name),
                    edgedbDatatypePrefix: "",
                }).join("");
            }
        };
        const { module: plainTypeModule } = getPlainTypeModule(type.name);
        plainTypeModule.types.set(name, getTypeName(type.name, true));
        plainTypeModule.buf.writeln([
            (0, builders_1.t) `export interface ${getTypeName(type.name)}${type.bases.length
                ? ` extends ${type.bases
                    .map(({ id }) => {
                    const baseType = types.get(id);
                    return getTypeName(baseType.name);
                })
                    .join(", ")}`
                : ""} ${type.pointers.length
                ? `{\n${type.pointers
                    .map(pointer => {
                    const isOptional = pointer.real_cardinality === enums_1.Cardinality.AtMostOne;
                    return `  ${(0, genutil_1.quote)(pointer.name)}${isOptional ? "?" : ""}: ${getTSType(pointer)}${pointer.real_cardinality === enums_1.Cardinality.Many ||
                        pointer.real_cardinality === enums_1.Cardinality.AtLeastOne
                        ? "[]"
                        : ""}${isOptional ? " | null" : ""};`;
                })
                    .join("\n")}\n}`
                : "{}"}\n`,
        ]);
        const ptrToLine = ptr => {
            var _a, _b, _c, _d;
            const card = `$.Cardinality.${ptr.real_cardinality}`;
            const target = types.get(ptr.target_id);
            const { staticType, runtimeType } = (0, exports.getStringRepresentation)(target, {
                types,
            });
            return {
                key: ptr.name,
                staticType,
                runtimeType,
                card,
                kind: ptr.kind,
                isExclusive: ptr.is_exclusive,
                is_computed: (_a = ptr.is_computed) !== null && _a !== void 0 ? _a : false,
                is_readonly: (_b = ptr.is_readonly) !== null && _b !== void 0 ? _b : false,
                hasDefault: (_c = ptr.has_default) !== null && _c !== void 0 ? _c : false,
                lines: ((_d = ptr.pointers) !== null && _d !== void 0 ? _d : [])
                    .filter(p => p.name !== "@target" && p.name !== "@source")
                    .map(ptrToLine),
            };
        };
        const lines = [
            ...type.pointers,
            ...type.backlinks,
            ...type.backlink_stubs,
        ].map(ptrToLine);
        const fieldNames = new Set(lines.map(l => l.key));
        const baseTypesUnion = type.bases.length
            ? (0, genutil_1.frag) `${(0, genutil_1.joinFrags)(type.bases.map(base => {
                const baseType = types.get(base.id);
                const overloadedFields = [
                    ...baseType.pointers,
                    ...baseType.backlinks,
                    ...baseType.backlink_stubs,
                ]
                    .filter(field => fieldNames.has(field.name))
                    .map(field => (0, genutil_1.quote)(field.name));
                const baseRef = (0, genutil_1.getRef)(baseType.name);
                return overloadedFields.length
                    ? (0, genutil_1.frag) `Omit<${baseRef}λShape, ${overloadedFields.join(" | ")}>`
                    : (0, genutil_1.frag) `${baseRef}λShape`;
            }), " & ")} & `
            : ``;
        body.writeln([
            (0, builders_1.t) `export `,
            (0, builders_1.dts) `declare `,
            (0, builders_1.t) `type ${ref}λShape = $.typeutil.flatten<${baseTypesUnion}{`,
        ]);
        body.indented(() => {
            for (const line of lines) {
                if (line.kind === "link") {
                    if (!line.lines.length) {
                        body.writeln([
                            (0, builders_1.t) `${(0, genutil_1.quote)(line.key)}: $.LinkDesc<${line.staticType}, ${line.card}, {}, ${line.isExclusive.toString()}, ${line.is_computed.toString()},  ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
                        ]);
                    }
                    else {
                        body.writeln([
                            (0, builders_1.t) `${(0, genutil_1.quote)(line.key)}: $.LinkDesc<${line.staticType}, ${line.card}, {`,
                        ]);
                        body.indented(() => {
                            for (const linkProp of line.lines) {
                                body.writeln([
                                    (0, builders_1.t) `${(0, genutil_1.quote)(linkProp.key)}: $.PropertyDesc<${linkProp.staticType}, ${linkProp.card}>;`,
                                ]);
                            }
                        });
                        body.writeln([
                            (0, builders_1.t) `}, ${line.isExclusive.toString()}, ${line.is_computed.toString()}, ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
                        ]);
                    }
                }
                else {
                    body.writeln([
                        (0, builders_1.t) `${(0, genutil_1.quote)(line.key)}: $.PropertyDesc<${line.staticType}, ${line.card}, ${line.isExclusive.toString()}, ${line.is_computed.toString()}, ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
                    ]);
                }
            }
        });
        body.writeln([(0, builders_1.t) `}>;`]);
        body.writeln([
            (0, builders_1.dts) `declare `,
            (0, builders_1.t) `type ${ref} = $.ObjectType<${(0, genutil_1.quote)(type.name)}, ${ref}λShape, null>;`,
        ]);
        if (type.name === "std::Object") {
            body.writeln([(0, builders_1.t) `export `, (0, builders_1.dts) `declare `, (0, builders_1.t) `type $Object = ${ref}`]);
        }
        const literal = (0, genutil_1.getRef)(type.name, { prefix: "" });
        body.writeln([
            (0, builders_1.dts) `declare `,
            ...(0, genutil_1.frag) `const ${ref}`,
            (0, builders_1.dts) `: ${ref}`,
            (0, builders_1.r) ` = $.makeType`,
            (0, builders_1.ts) `<${ref}>`,
            (0, builders_1.r) `(_.spec, ${(0, genutil_1.quote)(type.id)}, _.syntax.literal);`,
        ]);
        body.addExport(ref);
        const typeCard = singletonObjectTypes.has(type.name) ? "One" : "Many";
        body.nl();
        body.writeln([
            (0, builders_1.dts) `declare `,
            ...(0, genutil_1.frag) `const ${literal}`,
            (0, builders_1.t) `: $.$expr_PathNode<$.TypeSet<${ref}, $.Cardinality.${typeCard}>, null, true> `,
            (0, builders_1.r) `= _.syntax.$PathNode($.$toSet(${ref}, $.Cardinality.${typeCard}), null, true);`,
        ]);
        body.nl();
        body.addExport(literal);
        body.addToDefaultExport(literal, name);
    }
    const plainTypesExportBuf = new builders_1.CodeBuffer();
    for (const [moduleName, module] of plainTypeModules) {
        if (moduleName === "default") {
            plainTypesCode.writeBuf(module.buf);
        }
        else {
            plainTypesCode.writeln([(0, builders_1.t) `export namespace ${module.internalName} {`]);
            plainTypesCode.indented(() => plainTypesCode.writeBuf(module.buf));
            plainTypesCode.writeln([(0, builders_1.t) `}`]);
        }
        plainTypesExportBuf.writeln([
            (0, builders_1.t) `  ${(0, genutil_1.quote)(moduleName)}: {\n${[...module.types.entries()]
                .map(([name, typeName]) => `    ${(0, genutil_1.quote)(name)}: ${typeName};`)
                .join("\n")}\n  };`,
        ]);
    }
    plainTypesCode.writeln([(0, builders_1.t) `export interface types {`]);
    plainTypesCode.writeBuf(plainTypesExportBuf);
    plainTypesCode.writeln([(0, builders_1.t) `}`]);
};
exports.generateObjectTypes = generateObjectTypes;
