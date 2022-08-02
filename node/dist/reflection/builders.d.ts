declare type Mode = "ts" | "js" | "dts";
declare type ModuleKind = "esm" | "cjs";
export interface IdentRef {
    type: "identRef";
    name: string;
    opts?: {
        prefix?: string;
    };
}
export declare type CodeFragment = string | IdentRef;
export interface Frag {
    type: "frag";
    modes: Set<Mode>;
    content: CodeFragment[];
}
export declare const f: (...modes: Mode[]) => (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
export declare const ts: (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
export declare const js: (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
export declare const dts: (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
export declare const r: (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
export declare const all: (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
export declare const t: (strings: TemplateStringsArray, ...exprs: (CodeFragment | CodeFragment[])[]) => Frag;
declare type AnyCodeFrag = CodeFragment | Frag;
export declare class CodeBuffer {
    private buf;
    private indent;
    getBuf(): AnyCodeFrag[][];
    nl(): void;
    indented(nested: () => void): void;
    writeln(...lines: AnyCodeFrag[][]): void;
    writeBuf(buf: CodeBuffer): void;
    isEmpty(): boolean;
}
declare type ImportParams = {
    allowFileExt?: boolean;
    modes?: Mode[];
    typeOnly?: boolean;
};
declare type ExportParams = {
    modes?: Mode[];
};
export declare class CodeBuilder {
    private dirBuilder;
    private dir;
    private buf;
    private importsExports;
    constructor(dirBuilder: DirBuilder, dir: string);
    addImport: (names: {
        [key: string]: string | boolean;
    }, fromPath: string, params?: ImportParams) => void;
    addImportDefault: (name: string, fromPath: string, params?: ImportParams) => void;
    addImportStar: (name: string, fromPath: string, params?: ImportParams) => void;
    addExport: (name: string | IdentRef | (string | IdentRef)[], params?: ExportParams & {
        as?: string | undefined;
        typeOnly?: boolean | undefined;
    }) => void;
    addExportDefault: (name: string | IdentRef | (string | IdentRef)[], params?: ExportParams) => void;
    addToDefaultExport: (ref: IdentRef, as: string) => void;
    addExportFrom: (names: {
        [key: string]: string | boolean;
    }, fromPath: string, params?: ImportParams) => void;
    addExportStar: (fromPath: string, params?: Omit<ImportParams, "typeOnly"> & {
        as?: string | undefined;
    }) => void;
    getDefaultExportKeys(): string[];
    registerRef(name: string, suffix?: string): void;
    nl(): void;
    indented(nested: () => void): void;
    writeln(...lines: AnyCodeFrag[][]): void;
    writeBuf(buf: CodeBuffer): void;
    private resolveIdentRef;
    render({ mode, moduleKind, forceDefaultExport, moduleExtension, }: {
        mode: Mode;
        moduleKind: ModuleKind;
        forceDefaultExport?: boolean;
        moduleExtension: string;
    }): string;
    isEmpty(): boolean;
}
export declare class DirBuilder {
    private _map;
    _refs: Map<string, {
        internalName: string;
        dir: string;
    }>;
    _modules: Map<string, string>;
    getPath(fn: string): CodeBuilder;
    getModule(moduleName: string, isDeno: boolean): CodeBuilder;
    debug(): string;
    write(to: string, params: {
        mode: "ts" | "js" | "dts";
        moduleKind: ModuleKind;
        fileExtension: string;
        moduleExtension: string;
    }): Promise<void>;
}
export {};
