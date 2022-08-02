#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_node_1 = require("../adapter.node");
const conUtils_1 = require("../conUtils");
const generate_1 = require("./generate");
const rmdir = Number(process.versions.node.split(".")[0]) >= 16 ? adapter_node_1.fs.rm : adapter_node_1.fs.rmdir;
const run = async () => {
    const args = process.argv.slice(2);
    const connectionConfig = {};
    const options = {};
    while (args.length) {
        let flag = args.shift();
        let val = null;
        if (flag.startsWith("--")) {
            if (flag.includes("=")) {
                const [f, ...v] = flag.split("=");
                flag = f;
                val = v.join("=");
            }
        }
        else if (flag.startsWith("-")) {
            val = flag.slice(2) || null;
            flag = flag.slice(0, 2);
        }
        const getVal = () => {
            if (val !== null) {
                const v = val;
                val = null;
                return v;
            }
            if (args.length === 0) {
                (0, generate_1.exitWithError)(`No value provided for ${flag} option`);
            }
            return args.shift();
        };
        switch (flag) {
            case "-h":
            case "--help":
                options.showHelp = true;
                break;
            case "-I":
            case "--instance":
            case "--dsn":
                connectionConfig.dsn = getVal();
                break;
            case "--credentials-file":
                connectionConfig.credentialsFile = getVal();
                break;
            case "-H":
            case "--host":
                connectionConfig.host = getVal();
                break;
            case "-P":
            case "--port":
                connectionConfig.port = Number(getVal());
                break;
            case "-d":
            case "--database":
                connectionConfig.database = getVal();
                break;
            case "-u":
            case "--user":
                connectionConfig.user = getVal();
                break;
            case "--password":
                if (options.passwordFromStdin === true) {
                    (0, generate_1.exitWithError)(`Cannot use both --password and --password-from-stdin options`);
                }
                options.promptPassword = true;
                break;
            case "--password-from-stdin":
                if (options.promptPassword === true) {
                    (0, generate_1.exitWithError)(`Cannot use both --password and --password-from-stdin options`);
                }
                options.passwordFromStdin = true;
                break;
            case "--tls-ca-file":
                connectionConfig.tlsCAFile = getVal();
                break;
            case "--tls-security":
                const tlsSec = getVal();
                if (!conUtils_1.validTlsSecurityValues.includes(tlsSec)) {
                    (0, generate_1.exitWithError)(`Invalid value for --tls-security. Must be one of: ${conUtils_1.validTlsSecurityValues
                        .map(x => `"${x}"`)
                        .join(" | ")}`);
                }
                connectionConfig.tlsSecurity = tlsSec;
                break;
            case "--target":
                const target = getVal();
                if (!target || !["ts", "esm", "cjs", "mts", "deno"].includes(target)) {
                    (0, generate_1.exitWithError)(`Invalid target "${target !== null && target !== void 0 ? target : ""}", expected "deno", "mts", "ts", "esm" or "cjs"`);
                }
                options.target = target;
                break;
            case "--output-dir":
                options.outputDir = getVal();
                break;
            case "--force-overwrite":
                options.forceOverwrite = true;
                break;
            default:
                (0, generate_1.exitWithError)(`Unknown option: ${flag}`);
        }
        if (val !== null) {
            (0, generate_1.exitWithError)(`Option ${flag} does not take a value`);
        }
    }
    if (options.showHelp) {
        console.log(`edgeql-js

Introspects the schema of an EdgeDB instance and generates a TypeScript/JavaScript query builder

CONNECTION OPTIONS:
    -I, --instance <instance>
    --dsn <dsn>
    --credentials-file <path/to/credentials.json>
    -H, --host <host>
    -P, --port <port>
    -d, --database <database>
    -u, --user <user>
    --password
    --password-from-stdin
    --tls-ca-file <path/to/certificate>
    --tls-security <insecure | no_host_verification | strict | default>

OPTIONS:
    --target [ts,esm,cjs,mts]

        ts     Generate TypeScript files (.ts)
        mts    Generate TypeScript files (.mts) with extensioned ESM imports
        esm    Generate JavaScript with ESM syntax
        cjs    Generate JavaScript with CommonJS syntax

    --output-dir <output-dir>
    --force-overwrite
        If 'output-dir' already exists, will overwrite without confirmation
`);
        process.exit();
    }
    let projectRoot = "";
    let currentDir = process.cwd();
    const systemRoot = adapter_node_1.path.parse(currentDir).root;
    if (options.target === "deno") {
        projectRoot = currentDir;
    }
    else {
        while (currentDir !== systemRoot) {
            if (await (0, adapter_node_1.exists)(adapter_node_1.path.join(currentDir, "package.json"))) {
                projectRoot = currentDir;
                break;
            }
            currentDir = adapter_node_1.path.join(currentDir, "..");
        }
        if (!projectRoot) {
            (0, generate_1.exitWithError)("Error: no package.json found. Make sure you're inside your project directory.");
        }
    }
    if (!options.target) {
        const tsConfigPath = adapter_node_1.path.join(projectRoot, "tsconfig.json");
        const tsConfigExists = await (0, adapter_node_1.exists)(tsConfigPath);
        const overrideTargetMessage = `   To override this, use the --target flag.
   Run \`npx edgeql-js --help\` for details.`;
        const packageJson = JSON.parse(await (0, adapter_node_1.readFileUtf8)(adapter_node_1.path.join(projectRoot, "package.json")));
        if (tsConfigExists) {
            const tsConfig = tsConfigExists
                ? (await (0, adapter_node_1.readFileUtf8)(tsConfigPath)).toLowerCase()
                : "{}";
            const supportsESM = tsConfig.includes(`"module": "nodenext"`) ||
                tsConfig.includes(`"module": "node12"`);
            if (supportsESM && (packageJson === null || packageJson === void 0 ? void 0 : packageJson.type) === "module") {
                options.target = "mts";
                console.log(`Detected tsconfig.json with ES module support, generating .mts files with ESM imports.`);
            }
            else {
                options.target = "ts";
                console.log(`Detected tsconfig.json, generating TypeScript files.`);
            }
        }
        else {
            if ((packageJson === null || packageJson === void 0 ? void 0 : packageJson.type) === "module") {
                options.target = "esm";
                console.log(`Detected "type": "module" in package.json, generating .js files with ES module syntax.`);
            }
            else {
                console.log(`Detected package.json. Generating .js files with CommonJS module syntax.`);
                options.target = "cjs";
            }
        }
        console.log(overrideTargetMessage);
    }
    const outputDir = options.outputDir
        ? adapter_node_1.path.resolve(projectRoot, options.outputDir || "")
        : adapter_node_1.path.join(projectRoot, "dbschema", "edgeql-js");
    const relativeOutputDir = adapter_node_1.path.posix.relative(projectRoot, outputDir);
    const outputDirInProject = !!relativeOutputDir &&
        !adapter_node_1.path.isAbsolute(relativeOutputDir) &&
        !relativeOutputDir.startsWith("..");
    const prettyOutputDir = outputDirInProject
        ? `./${relativeOutputDir}`
        : outputDir;
    console.log(`Generating query builder into ${adapter_node_1.path.isAbsolute(prettyOutputDir)
        ? `\n   ${prettyOutputDir}`
        : `${prettyOutputDir}`}`);
    if (await (0, adapter_node_1.exists)(outputDir)) {
        if (await canOverwrite(outputDir, options)) {
            await rmdir(outputDir, { recursive: true });
        }
    }
    else {
        options.updateIgnoreFile = true;
    }
    if (options.promptPassword) {
        const username = (await (0, conUtils_1.parseConnectArguments)({
            ...connectionConfig,
            password: "",
        })).connectionParams.user;
        connectionConfig.password = await promptForPassword(username);
    }
    if (options.passwordFromStdin) {
        connectionConfig.password = await readPasswordFromStdin();
    }
    await (0, generate_1.generateQB)({ outputDir, connectionConfig, target: options.target });
    console.log(`Generation successful!`);
    if (!outputDirInProject) {
        console.log(`\nChecking the generated query builder into version control
is not recommended. Consider updating the .gitignore of your
project to exclude these files.`);
    }
    else if (options.updateIgnoreFile) {
        const gitIgnorePath = adapter_node_1.path.join(projectRoot, ".gitignore");
        let gitIgnoreFile = null;
        try {
            gitIgnoreFile = await (0, adapter_node_1.readFileUtf8)(gitIgnorePath);
        }
        catch { }
        const vcsLine = adapter_node_1.path.posix.relative(projectRoot, outputDir);
        if (gitIgnoreFile === null ||
            !RegExp(`^${vcsLine}$`, "m").test(gitIgnoreFile)) {
            if (await promptBoolean(gitIgnoreFile === null
                ? `Checking the generated query builder into version control
is NOT RECOMMENDED. Would you like to create a .gitignore file to ignore
the query builder directory? `
                : `Checking the generated query builder into version control
is NOT RECOMMENDED. Would you like to update .gitignore to ignore
the query builder directory? The following line will be added:

  ${vcsLine}\n\n`, true)) {
                await adapter_node_1.fs.appendFile(gitIgnorePath, `${gitIgnoreFile === null ? "" : "\n"}${vcsLine}\n`);
            }
        }
    }
    process.exit();
};
run();
async function canOverwrite(outputDir, options) {
    if (options.forceOverwrite) {
        return true;
    }
    let config = null;
    try {
        const configFile = await (0, adapter_node_1.readFileUtf8)(adapter_node_1.path.join(outputDir, "config.json"));
        if (configFile.startsWith(generate_1.configFileHeader)) {
            config = JSON.parse(configFile.slice(generate_1.configFileHeader.length));
            if (config.target === options.target) {
                return true;
            }
        }
    }
    catch { }
    const error = config
        ? `A query builder with a different config already exists in that location.`
        : `Output directory '${outputDir}' already exists.`;
    if (isTTY() &&
        (await promptBoolean(`${error}\nDo you want to overwrite? `, true))) {
        return true;
    }
    return (0, generate_1.exitWithError)(`Error: ${error}`);
}
function isTTY() {
    return process.stdin.isTTY && process.stdout.isTTY;
}
async function promptBoolean(prompt, defaultVal) {
    const response = await promptEnum(prompt, ["y", "n"], defaultVal !== undefined ? (defaultVal ? "y" : "n") : undefined);
    return response === "y";
}
async function promptEnum(question, vals, defaultVal) {
    let response = await (0, adapter_node_1.input)(`${question}[${vals.join("/")}]${defaultVal !== undefined ? ` (leave blank for "${defaultVal}")` : ""}\n> `);
    response = response.trim().toLowerCase();
    if (vals.includes(response)) {
        return response;
    }
    else if (!response && defaultVal !== undefined) {
        return defaultVal;
    }
    else {
        (0, generate_1.exitWithError)(`Unknown value: '${response}'`);
    }
}
async function promptForPassword(username) {
    if (!isTTY()) {
        (0, generate_1.exitWithError)(`Cannot use --password option in non-interactive mode. ` +
            `To read password from stdin use the --password-from-stdin option.`);
    }
    return await (0, adapter_node_1.input)(`Password for '${username}': `, { silent: true });
}
function readPasswordFromStdin() {
    if (process.stdin.isTTY) {
        (0, generate_1.exitWithError)(`Cannot read password from stdin: stdin is a TTY.`);
    }
    return new Promise(resolve => {
        let data = "";
        process.stdin.on("data", chunk => (data += chunk));
        process.stdin.on("end", () => resolve(data.trimEnd()));
    });
}
