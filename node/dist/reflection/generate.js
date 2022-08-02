"use strict";
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
exports.generateQB = exports.exitWithError = exports.configFileHeader = void 0;
const adapter_node_1 = require("../adapter.node");
const builders_1 = require("./builders");
const index_node_1 = require("../index.node");
const getCasts_1 = require("./queries/getCasts");
const getScalars_1 = require("./queries/getScalars");
const getFunctions_1 = require("./queries/getFunctions");
const getOperators_1 = require("./queries/getOperators");
const getGlobals_1 = require("./queries/getGlobals");
const getTypes_1 = require("./queries/getTypes");
const genutil = __importStar(require("./util/genutil"));
const generateCastMaps_1 = require("./generators/generateCastMaps");
const generateScalars_1 = require("./generators/generateScalars");
const generateObjectTypes_1 = require("./generators/generateObjectTypes");
const generateRuntimeSpec_1 = require("./generators/generateRuntimeSpec");
const generateFunctionTypes_1 = require("./generators/generateFunctionTypes");
const generateOperatorTypes_1 = require("./generators/generateOperatorTypes");
const generateGlobals_1 = require("./generators/generateGlobals");
const generateSetImpl_1 = require("./generators/generateSetImpl");
const DEBUG = false;
exports.configFileHeader = `// EdgeDB query builder. To update, run \`npx edgeql-js\``;
function exitWithError(message) {
    console.error(message);
    (0, adapter_node_1.exit)(1);
    throw new Error();
}
exports.exitWithError = exitWithError;
async function generateQB(params) {
    const { outputDir, connectionConfig, target } = params;
    console.log(`Connecting to EdgeDB instance...`);
    let cxn;
    try {
        cxn = (0, index_node_1.createClient)({
            ...connectionConfig,
            concurrency: 5,
        });
    }
    catch (e) {
        return exitWithError(`Failed to connect: ${e.message}`);
    }
    const dir = new builders_1.DirBuilder();
    try {
        console.log(`Introspecting database schema...`);
        const version = await cxn.queryRequiredSingle(`select sys::get_version();`);
        const [types, scalars, casts, functions, operators, globals] = await Promise.all([
            (0, getTypes_1.getTypes)(cxn, { debug: DEBUG, version }),
            (0, getScalars_1.getScalars)(cxn, { version }),
            (0, getCasts_1.getCasts)(cxn, { debug: DEBUG, version }),
            (0, getFunctions_1.getFunctions)(cxn, { version }),
            (0, getOperators_1.getOperators)(cxn, { version }),
            (0, getGlobals_1.getGlobals)(cxn, { version }),
        ]);
        const typesByName = {};
        for (const type of types.values()) {
            typesByName[type.name] = type;
            if (!type.name.includes("::"))
                continue;
        }
        const generatorParams = {
            dir,
            types,
            typesByName,
            casts,
            scalars,
            functions,
            globals,
            operators,
            isDeno: target === "deno",
        };
        (0, generateRuntimeSpec_1.generateRuntimeSpec)(generatorParams);
        (0, generateCastMaps_1.generateCastMaps)(generatorParams);
        (0, generateScalars_1.generateScalars)(generatorParams);
        (0, generateObjectTypes_1.generateObjectTypes)(generatorParams);
        (0, generateFunctionTypes_1.generateFunctionTypes)(generatorParams);
        (0, generateOperatorTypes_1.generateOperators)(generatorParams);
        (0, generateSetImpl_1.generateSetImpl)(generatorParams);
        (0, generateGlobals_1.generateGlobals)(generatorParams);
        const importsFile = dir.getPath("imports");
        const edgedb = target === "deno" ? "https://deno.land/x/edgedb/mod.ts" : "edgedb";
        importsFile.addExportStar(edgedb, { as: "edgedb" });
        importsFile.addExportFrom({ spec: true }, "./__spec__", {
            allowFileExt: true,
        });
        importsFile.addExportStar("./syntax/syntax", {
            allowFileExt: true,
            as: "syntax",
        });
        importsFile.addExportStar("./castMaps", {
            allowFileExt: true,
            as: "castMaps",
        });
        const index = dir.getPath("index");
        index.addExportStar("./syntax/external", {
            allowFileExt: true,
        });
        index.addExportStar("./types", {
            allowFileExt: true,
            modes: ["ts", "dts"],
        });
        index.addImport({ $: true, _edgedbJsVersion: true }, edgedb);
        index.addExportFrom({ createClient: true }, edgedb);
        index.addImportStar("$syntax", "./syntax/syntax", { allowFileExt: true });
        index.addImportStar("$op", "./operators", { allowFileExt: true });
        index.writeln([
            (0, builders_1.r) `\nif (_edgedbJsVersion !== "${index_node_1._edgedbJsVersion}") {
  throw new Error(
    \`The query builder was generated by a different version of edgedb-js (v${index_node_1._edgedbJsVersion})\` +
      \` than the one currently installed (v\${_edgedbJsVersion}).\\n\` +
      \`Run 'npx edgeql-js' to re-generate a compatible version.\\n\`
  );
}`,
        ]);
        const spreadModules = [
            {
                name: "$op",
                keys: ["op"],
            },
            {
                name: "$syntax",
                keys: [
                    "ASC",
                    "DESC",
                    "EMPTY_FIRST",
                    "EMPTY_LAST",
                    "alias",
                    "array",
                    "cast",
                    "detached",
                    "for",
                    "insert",
                    "is",
                    "literal",
                    "namedTuple",
                    "optional",
                    "select",
                    "set",
                    "tuple",
                    "with",
                    "withParams",
                ],
            },
            {
                name: "_default",
                module: dir.getModule("default", target === "deno"),
            },
            { name: "_std", module: dir.getModule("std", target === "deno") },
        ];
        const excludedKeys = new Set(dir._modules.keys());
        const spreadTypes = [];
        for (let { name, keys, module } of spreadModules) {
            if (module === null || module === void 0 ? void 0 : module.isEmpty()) {
                continue;
            }
            keys = keys !== null && keys !== void 0 ? keys : module.getDefaultExportKeys();
            const conflictingKeys = keys.filter(key => excludedKeys.has(key));
            let typeStr;
            if (conflictingKeys.length) {
                typeStr = `Omit<typeof ${name}, ${conflictingKeys
                    .map(genutil.quote)
                    .join(" | ")}>`;
            }
            else {
                typeStr = `typeof ${name}`;
            }
            spreadTypes.push(name === "$syntax" ? `$.util.OmitDollarPrefixed<${typeStr}>` : typeStr);
            for (const key of keys) {
                excludedKeys.add(key);
            }
        }
        index.nl();
        index.writeln([
            (0, builders_1.dts) `declare `,
            `const ExportDefault`,
            (0, builders_1.t) `: ${spreadTypes.reverse().join(" & \n  ")} & {`,
        ]);
        index.indented(() => {
            for (const [moduleName, internalName] of dir._modules) {
                if (dir.getModule(moduleName, target === "deno").isEmpty())
                    continue;
                index.writeln([
                    (0, builders_1.t) `${genutil.quote(moduleName)}: typeof _${internalName};`,
                ]);
            }
        });
        index.writeln([(0, builders_1.t) `}`, (0, builders_1.r) ` = {`]);
        index.indented(() => {
            for (const { name, module } of [...spreadModules].reverse()) {
                if (module === null || module === void 0 ? void 0 : module.isEmpty()) {
                    continue;
                }
                index.writeln([
                    (0, builders_1.r) `...${name === "$syntax" ? `$.util.omitDollarPrefixed($syntax)` : name},`,
                ]);
            }
            for (const [moduleName, internalName] of dir._modules) {
                if (dir.getModule(moduleName, target === "deno").isEmpty()) {
                    continue;
                }
                index.addImportDefault(`_${internalName}`, `./modules/${internalName}`, { allowFileExt: true });
                index.writeln([(0, builders_1.r) `${genutil.quote(moduleName)}: _${internalName},`]);
            }
        });
        index.writeln([(0, builders_1.r) `};`]);
        index.addExportDefault("ExportDefault");
        index.writeln([(0, builders_1.r) `const Cardinality = $.Cardinality;`]);
        index.writeln([(0, builders_1.dts) `declare `, (0, builders_1.t) `type Cardinality = $.Cardinality;`]);
        index.addExport("Cardinality");
        index.writeln([
            (0, builders_1.t) `export `,
            (0, builders_1.dts) `declare `,
            (0, builders_1.t) `type Set<
  Type extends $.BaseType,
  Cardinality extends $.Cardinality = $.Cardinality.Many
> = $.TypeSet<Type, Cardinality>;`,
        ]);
    }
    finally {
        await cxn.close();
    }
    if (target === "ts") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".ts",
            moduleExtension: "",
        });
    }
    else if (target === "mts") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".mts",
            moduleExtension: ".mjs",
        });
    }
    else if (target === "cjs") {
        await dir.write(outputDir, {
            mode: "js",
            moduleKind: "cjs",
            fileExtension: ".js",
            moduleExtension: "",
        });
        await dir.write(outputDir, {
            mode: "dts",
            moduleKind: "esm",
            fileExtension: ".d.ts",
            moduleExtension: "",
        });
    }
    else if (target === "esm") {
        await dir.write(outputDir, {
            mode: "js",
            moduleKind: "esm",
            fileExtension: ".mjs",
            moduleExtension: ".mjs",
        });
        await dir.write(outputDir, {
            mode: "dts",
            moduleKind: "esm",
            fileExtension: ".d.ts",
            moduleExtension: "",
        });
    }
    else if (target === "deno") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".ts",
            moduleExtension: ".ts",
        });
    }
    const syntaxDir = adapter_node_1.path.join((0, adapter_node_1.srcDir)(), "syntax");
    const syntaxOutDir = adapter_node_1.path.join(outputDir, "syntax");
    if (!(await (0, adapter_node_1.exists)(syntaxOutDir))) {
        await adapter_node_1.fs.mkdir(syntaxOutDir);
    }
    const syntaxFiles = await (0, adapter_node_1.readDir)(syntaxDir);
    for (const fileName of syntaxFiles) {
        const filetype = fileName.endsWith(".js")
            ? "js"
            : fileName.endsWith(".mjs")
                ? "esm"
                : fileName.endsWith(".mts")
                    ? "mts"
                    : fileName.endsWith(".d.ts")
                        ? "dts"
                        : fileName.endsWith(".ts")
                            ? "ts"
                            : null;
        if ((target === "deno" && filetype !== "ts") ||
            (target === "ts" && filetype !== "ts") ||
            (target === "mts" && filetype !== "mts") ||
            (target === "esm" && !(filetype === "esm" || filetype === "dts")) ||
            (target === "cjs" && !(filetype === "js" || filetype === "dts"))) {
            continue;
        }
        const filePath = adapter_node_1.path.join(syntaxDir, fileName);
        let contents = await (0, adapter_node_1.readFileUtf8)(filePath);
        if (contents.indexOf(`"edgedb/dist/reflection"`) !== -1) {
            throw new Error("No directory imports allowed in `syntax` files.");
        }
        const localExt = filetype === "esm" ? ".mjs" : target === "mts" ? ".mjs" : "";
        const pkgExt = filetype === "esm" ? ".js" : target === "mts" ? ".js" : "";
        contents = contents
            .replace(/require\("(..\/)?reflection([a-zA-Z0-9\_\/]*)\.?(.*)"\)/g, `require("edgedb/dist/reflection$2${pkgExt}")`)
            .replace(/require\("@generated\/(.*)"\)/g, `require("../$1")`)
            .replace(/from "(..\/)?reflection([a-zA-Z0-9\_\/]*)\.?([a-z]*)"/g, `from "edgedb/dist/reflection$2${pkgExt}"`)
            .replace(/from "@generated\/(.*)";/g, `from "../$1";`);
        if (localExt) {
            contents = contents.replace(/from "(\.?\.\/.+)"/g, `from "$1${localExt}"`);
        }
        if (target === "deno") {
            contents = contents
                .replace(/from "edgedb\/dist(.+)"/g, (_match, group) => {
                const end = group.includes(".ts") ? "" : ".ts";
                return `from "https://deno.land/x/edgedb/_src${group}${end}"`;
            })
                .replace(/from "edgedb"/g, () => {
                return `from "https://deno.land/x/edgedb/mod.ts"`;
            })
                .replace(/from "([\.\/]+)(.+)"/g, (_match, group1, group2) => {
                const end = group2.includes(".ts") ? "" : ".ts";
                const output = `from "${group1}${group2}${end}"`;
                return output;
            });
        }
        const outputPath = adapter_node_1.path.join(syntaxOutDir, fileName);
        await adapter_node_1.fs.writeFile(outputPath, contents);
    }
    await adapter_node_1.fs.writeFile(adapter_node_1.path.join(outputDir, "config.json"), `${exports.configFileHeader}\n${JSON.stringify({ target })}\n`);
}
exports.generateQB = generateQB;
