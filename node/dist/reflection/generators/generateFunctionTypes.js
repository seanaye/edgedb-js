"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReturnCardinality = exports.generateFuncopDef = exports.generateFuncopTypes = exports.allowsLiterals = exports.generateFunctionTypes = void 0;
const genutil_1 = require("../util/genutil");
const builders_1 = require("../builders");
const generateObjectTypes_1 = require("./generateObjectTypes");
const functionUtils_1 = require("../util/functionUtils");
const generateFunctionTypes = ({ dir, functions, types, casts, isDeno, }) => {
    generateFuncopTypes(dir, types, casts, functions, "Function", "FuncExpr", true, (code, funcDef, args, namedArgs, returnType) => {
        code.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(funcDef.name)},`]);
        code.writeln([(0, builders_1.t) `${args}`]);
        code.writeln([(0, builders_1.t) `${namedArgs}`]);
        code.writeln([(0, builders_1.t) `${returnType}`]);
    }, (code, funcName) => {
        code.writeln([(0, builders_1.r) `__name__: ${(0, genutil_1.quote)(funcName)},`]);
        code.writeln([(0, builders_1.r) `__args__: positionalArgs,`]);
        code.writeln([(0, builders_1.r) `__namedargs__: namedArgs,`]);
    }, isDeno);
};
exports.generateFunctionTypes = generateFunctionTypes;
function allowsLiterals(type, anytypes) {
    return ((type.name === "anytype" && (anytypes === null || anytypes === void 0 ? void 0 : anytypes.kind) === "noncastable") ||
        type.kind === "scalar");
}
exports.allowsLiterals = allowsLiterals;
function generateFuncopTypes(dir, types, casts, funcops, funcopExprKind, typeDefSuffix, optionalUndefined, typeDefGen, implReturnGen, isDeno) {
    const typeSpecificities = (0, functionUtils_1.getTypesSpecificity)(types, casts);
    const implicitCastableRootTypes = (0, functionUtils_1.getImplicitCastableRootTypes)(casts);
    for (const [funcName, _funcDefs] of funcops.entries()) {
        const { mod, name } = (0, genutil_1.splitName)(funcName);
        const code = dir.getModule(mod, isDeno);
        code.registerRef(funcName, _funcDefs[0].id);
        code.addToDefaultExport((0, genutil_1.getRef)(funcName, { prefix: "" }), name);
        if (funcName === "std::range") {
            code.writeln([(0, builders_1.dts) `declare `, (0, builders_1.all) `const range = _.syntax.$range;`]);
            code.nl();
            continue;
        }
        const funcDefs = (0, functionUtils_1.expandFuncopAnytypeOverloads)((0, functionUtils_1.sortFuncopOverloads)(_funcDefs, typeSpecificities), types, casts, implicitCastableRootTypes);
        const overloadsBuf = new builders_1.CodeBuffer();
        let overloadDefIndex = 1;
        for (const funcDef of funcDefs) {
            const { params } = funcDef;
            const hasParams = params.positional.length + params.named.length > 0;
            const namedParamsOverloads = !hasParams ||
                params.positional.length === 0 ||
                params.named.some(param => !(param.typemod === "OptionalType" || param.hasDefault))
                ? [true]
                : params.named.length > 0
                    ? [true, false]
                    : [false];
            for (const hasNamedParams of namedParamsOverloads) {
                if (funcDef.description) {
                    overloadsBuf.writeln([
                        (0, builders_1.t) `/**
 * ${funcDef.description.replace(/\*\//g, "")}
 */`,
                    ]);
                }
                const functionTypeName = (0, genutil_1.frag) `${(0, genutil_1.getRef)(funcName, {
                    prefix: "",
                })}λ${typeDefSuffix}${overloadDefIndex++ > 1 ? String(overloadDefIndex - 1) : ""}`;
                const functionTypeSig = (0, genutil_1.frag) `${functionTypeName}${hasParams
                    ? `<${[
                        ...(hasNamedParams ? ["NamedArgs"] : []),
                        ...params.positional.map(param => param.typeName),
                    ].join(", ")}>`
                    : ""};`;
                code.writeln([
                    (0, builders_1.dts) `declare `,
                    (0, builders_1.t) `type ${functionTypeName}${hasParams ? `<` : ` = $.$expr_${funcopExprKind}<`}`,
                ]);
                overloadsBuf.writeln([
                    (0, builders_1.dts) `declare `,
                    (0, builders_1.t) `function ${(0, genutil_1.getRef)(funcName, { prefix: "" })}${hasParams ? "<" : (0, genutil_1.frag) `(): ${functionTypeSig}`}`,
                ]);
                const anytypes = funcDef.anytypes;
                const anytypeParams = [];
                function getParamAnytype(paramTypeName, paramType, optional) {
                    if (!anytypes)
                        return undefined;
                    if (anytypes.kind === "castable") {
                        if (paramType.name.includes("anytype") ||
                            paramType.name.includes("anypoint")) {
                            const path = (0, functionUtils_1.findPathOfAnytype)(paramType.id, types);
                            anytypeParams.push(optional
                                ? `${paramTypeName} extends $.TypeSet ? ${paramTypeName}${path} : undefined`
                                : `${paramTypeName}${path}`);
                        }
                        return anytypes.type;
                    }
                    else {
                        return anytypes.refName === paramTypeName
                            ? anytypes.type
                            : `$.getPrimitive${anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""}BaseType<${allowsLiterals(anytypes.typeObj, anytypes)
                                ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                                : anytypes.refName}${anytypes.refPath}>`;
                    }
                }
                let hasNamedLiterals = false;
                let hasPositionalLiterals = false;
                if (hasParams) {
                    code.indented(() => {
                        overloadsBuf.indented(() => {
                            if (hasNamedParams) {
                                code.writeln([(0, builders_1.t) `NamedArgs extends {`]);
                                overloadsBuf.writeln([(0, builders_1.t) `NamedArgs extends {`]);
                                code.indented(() => {
                                    overloadsBuf.indented(() => {
                                        for (const param of params.named) {
                                            const anytype = getParamAnytype(param.typeName, param.type, param.typemod === "OptionalType" || !!param.hasDefault);
                                            const paramType = (0, generateObjectTypes_1.getStringRepresentation)(param.type, {
                                                types,
                                                anytype,
                                                casts: casts.implicitCastFromMap,
                                            });
                                            let typeStr = (0, genutil_1.frag) `$.TypeSet<${paramType.staticType}>`;
                                            if (allowsLiterals(param.type, anytypes)) {
                                                typeStr = (0, genutil_1.frag) `_.castMaps.orScalarLiteral<${typeStr}>`;
                                                hasNamedLiterals = true;
                                            }
                                            const line = (0, builders_1.t) `${(0, genutil_1.quote)(param.name)}${param.typemod === "OptionalType" || param.hasDefault
                                                ? "?"
                                                : ""}: ${typeStr},`;
                                            code.writeln([line]);
                                            overloadsBuf.writeln([line]);
                                        }
                                    });
                                });
                                code.writeln([(0, builders_1.t) `},`]);
                                overloadsBuf.writeln([(0, builders_1.t) `},`]);
                            }
                            for (const param of params.positional) {
                                const anytype = getParamAnytype(param.typeName, param.type, optionalUndefined &&
                                    (param.typemod === "OptionalType" || !!param.hasDefault));
                                const paramTypeStr = (0, generateObjectTypes_1.getStringRepresentation)(param.type, {
                                    types,
                                    anytype,
                                    casts: casts.implicitCastFromMap,
                                });
                                let type = (0, genutil_1.frag) `$.TypeSet<${paramTypeStr.staticType}>`;
                                if (allowsLiterals(param.type, anytypes)) {
                                    type = (0, genutil_1.frag) `_.castMaps.orScalarLiteral<${type}>`;
                                    hasPositionalLiterals = true;
                                }
                                const line = (0, builders_1.t) `${param.typeName} extends ${param.kind === "VariadicParam"
                                    ? (0, genutil_1.frag) `[${type}, ...${type}[]]`
                                    : type}${optionalUndefined &&
                                    (param.typemod === "OptionalType" || param.hasDefault)
                                    ? " | undefined"
                                    : ""},`;
                                code.writeln([line]);
                                overloadsBuf.writeln([line]);
                            }
                        });
                    });
                    code.writeln([(0, builders_1.t) `> = $.$expr_${funcopExprKind}<`]);
                    overloadsBuf.writeln([(0, builders_1.t) `>(`]);
                    overloadsBuf.indented(() => {
                        if (hasNamedParams) {
                            overloadsBuf.writeln([(0, builders_1.t) `namedArgs: NamedArgs,`]);
                        }
                        for (const param of params.positional) {
                            overloadsBuf.writeln([
                                (0, builders_1.t) `${param.kind === "VariadicParam" ? "..." : ""}${param.internalName}${optionalUndefined &&
                                    (param.typemod === "OptionalType" || param.hasDefault)
                                    ? "?"
                                    : ""}: ${param.typeName}${param.kind === "VariadicParam" ? "" : ","}`,
                            ]);
                        }
                    });
                    overloadsBuf.writeln([(0, builders_1.t) `): ${functionTypeSig}`]);
                }
                code.indented(() => {
                    const returnAnytype = anytypes
                        ? anytypes.kind === "castable"
                            ? anytypeParams.length <= 1
                                ? anytypeParams[0]
                                : anytypeParams.slice(1).reduce((parent, type) => {
                                    return `${anytypes.returnAnytypeWrapper}<${parent}, ${type}>`;
                                }, anytypeParams[0])
                            : `$.getPrimitive${anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""}BaseType<${allowsLiterals(anytypes.typeObj, anytypes)
                                ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                                : anytypes.refName}${anytypes.refPath}>`
                        : undefined;
                    const returnType = (0, generateObjectTypes_1.getStringRepresentation)(types.get(funcDef.return_type.id), {
                        types,
                        anytype: returnAnytype,
                    });
                    const positionalParams = params.positional
                        .map(param => `${param.kind === "VariadicParam" ? "..." : ""}${param.typeName}`)
                        .join(", ");
                    typeDefGen(code, funcDef, hasPositionalLiterals
                        ? (0, genutil_1.frag) `_.castMaps.mapLiteralToTypeSet<[${positionalParams}]>,`
                        : (0, genutil_1.frag) `[${positionalParams}],`, (0, genutil_1.frag) `${hasParams && hasNamedParams
                        ? hasNamedLiterals
                            ? "_.castMaps.mapLiteralToTypeSet<NamedArgs>"
                            : "NamedArgs"
                        : "{}"},`, (0, genutil_1.frag) `$.TypeSet<${returnType.staticType}, ${generateReturnCardinality(funcName, params, funcDef.return_typemod, hasNamedParams, anytypes, funcDef.preserves_optionality)}>`);
                });
                code.writeln([(0, builders_1.t) `>;`]);
            }
        }
        code.writeBuf(overloadsBuf);
        code.writeln([
            (0, builders_1.r) `function ${(0, genutil_1.getRef)(funcName, { prefix: "" })}(...args`,
            (0, builders_1.ts) `: any[]`,
            (0, builders_1.r) `) {`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.r) `const {${funcDefs[0].kind ? "kind, " : ""}returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('${funcName}', args, _.spec, [`,
            ]);
            code.indented(() => {
                let overloadIndex = 0;
                for (const funcDef of funcDefs) {
                    if (funcDef.overloadIndex !== overloadIndex) {
                        continue;
                    }
                    overloadIndex++;
                    code.writeln([(0, builders_1.r) `${generateFuncopDef(funcDef)},`]);
                }
            });
            code.writeln([(0, builders_1.r) `]);`]);
            code.writeln([(0, builders_1.r) `return _.syntax.$expressionify({`]);
            code.indented(() => {
                code.writeln([(0, builders_1.r) `__kind__: $.ExpressionKind.${funcopExprKind},`]);
                code.writeln([(0, builders_1.r) `__element__: returnType,`]);
                code.writeln([(0, builders_1.r) `__cardinality__: cardinality,`]);
                implReturnGen(code, funcName, funcDefs);
            });
            code.writeln([(0, builders_1.r) `})`, (0, builders_1.ts) ` as any`, (0, builders_1.r) `;`]);
        });
        code.writeln([(0, builders_1.r) `};`]);
        code.nl();
    }
}
exports.generateFuncopTypes = generateFuncopTypes;
function generateFuncopDef(funcopDef) {
    const { params } = funcopDef;
    function getArgSpec(param) {
        return `{typeId: ${(0, genutil_1.quote)(param.type.id)}, optional: ${(param.typemod === "OptionalType" || !!param.hasDefault).toString()}, setoftype: ${(param.typemod === "SetOfType").toString()}, variadic: ${(param.kind === "VariadicParam").toString()}}`;
    }
    const argsDef = params.positional.map(param => {
        return getArgSpec(param);
    });
    const namedArgsDef = params.named.length
        ? `namedArgs: {${params.named
            .map(param => {
            return `${(0, genutil_1.quote)(param.name)}: ${getArgSpec(param)}`;
        })
            .join(", ")}}, `
        : "";
    return `{${funcopDef.kind ? `kind: ${(0, genutil_1.quote)(funcopDef.kind)}, ` : ""}args: [${argsDef.join(", ")}], ${namedArgsDef}returnTypeId: ${(0, genutil_1.quote)(funcopDef.return_type.id)}${funcopDef.return_typemod === "SingletonType"
        ? ""
        : `, returnTypemod: ${(0, genutil_1.quote)(funcopDef.return_typemod)}`}${funcopDef.preserves_optionality ? `, preservesOptionality: true` : ""}}`;
}
exports.generateFuncopDef = generateFuncopDef;
function generateReturnCardinality(name, params, returnTypemod, hasNamedParams, anytypes, preservesOptionality = false) {
    if (returnTypemod === "SetOfType" &&
        name !== "std::if_else" &&
        name !== "std::assert_exists" &&
        name !== "std::union" &&
        name !== "std::coalesce" &&
        name !== "std::distinct") {
        return `$.Cardinality.Many`;
    }
    const cardinalities = [
        ...params.positional.map(p => ({
            ...p,
            genTypeName: p.typeName,
        })),
        ...(hasNamedParams
            ? params.named.map(p => ({
                ...p,
                genTypeName: `NamedArgs[${(0, genutil_1.quote)(p.name)}]`,
            }))
            : []),
    ];
    if (name === "std::union") {
        return `$.cardinalityUtil.mergeCardinalities<
        $.cardinalityUtil.paramCardinality<${cardinalities[0].genTypeName}>,
        $.cardinalityUtil.paramCardinality<${cardinalities[1].genTypeName}>
      >`;
    }
    if (name === "std::coalesce") {
        return `$.cardinalityUtil.orCardinalities<
        $.cardinalityUtil.paramCardinality<${cardinalities[0].genTypeName}>,
        $.cardinalityUtil.paramCardinality<${cardinalities[1].genTypeName}>
      >`;
    }
    if (name === "std::distinct") {
        return `$.cardinalityUtil.paramCardinality<${cardinalities[0].genTypeName}>`;
    }
    if (name === "std::if_else") {
        return (`$.cardinalityUtil.multiplyCardinalities<` +
            `$.cardinalityUtil.orCardinalities<` +
            `$.cardinalityUtil.paramCardinality<${cardinalities[0].genTypeName}>,` +
            ` $.cardinalityUtil.paramCardinality<${cardinalities[2].genTypeName}>` +
            `>, $.cardinalityUtil.paramCardinality<${cardinalities[1].genTypeName}>>`);
    }
    if (name === "std::assert_exists") {
        return (`$.cardinalityUtil.overrideLowerBound<` +
            `$.cardinalityUtil.paramCardinality<${cardinalities[0].genTypeName}>, "One">`);
    }
    const paramCardinalities = cardinalities.map(param => {
        if (param.typemod === "SetOfType") {
            if (preservesOptionality) {
                return (`$.cardinalityUtil.overrideUpperBound<` +
                    `$.cardinalityUtil.paramCardinality<${param.genTypeName}>, "One">`);
            }
            else {
                return `$.Cardinality.One`;
            }
        }
        const prefix = param.typemod === "OptionalType" || param.hasDefault
            ? "$.cardinalityUtil.optionalParamCardinality"
            : param.kind === "VariadicParam"
                ? "$.cardinalityUtil.paramArrayCardinality"
                : "$.cardinalityUtil.paramCardinality";
        return `${prefix}<${param.genTypeName}>`;
    });
    const cardinality = paramCardinalities.length
        ? paramCardinalities.length > 1
            ? paramCardinalities
                .slice(1)
                .reduce((cards, card) => `$.cardinalityUtil.multiplyCardinalities<${cards}, ${card}>`, paramCardinalities[0])
            : paramCardinalities[0]
        : "$.Cardinality.One";
    return returnTypemod === "OptionalType" && !preservesOptionality
        ? `$.cardinalityUtil.overrideLowerBound<${cardinality}, 'Zero'>`
        : cardinality;
}
exports.generateReturnCardinality = generateReturnCardinality;
