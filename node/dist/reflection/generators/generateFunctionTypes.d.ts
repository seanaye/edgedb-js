import type { GeneratorParams } from "../generate";
import { CodeBuilder, CodeFragment, DirBuilder } from "../builders";
import { Param, Typemod } from "../queries/getFunctions";
import { introspect, StrictMap } from "../../reflection";
import { GroupedParams, AnytypeDef, FuncopDefOverload } from "../util/functionUtils";
import { Casts } from "../queries/getCasts";
export declare const generateFunctionTypes: ({ dir, functions, types, casts, isDeno, }: GeneratorParams) => void;
export declare function allowsLiterals(type: introspect.Type, anytypes: AnytypeDef | null): boolean;
export interface FuncopDef {
    id: string;
    name: string;
    kind?: string;
    description?: string;
    return_type: {
        id: string;
        name: string;
    };
    return_typemod: Typemod;
    params: Param[];
    preserves_optionality?: boolean;
}
export declare function generateFuncopTypes<F extends FuncopDef>(dir: DirBuilder, types: introspect.Types, casts: Casts, funcops: StrictMap<string, F[]>, funcopExprKind: string, typeDefSuffix: string, optionalUndefined: boolean, typeDefGen: (code: CodeBuilder, def: F, args: CodeFragment[], namedArgs: CodeFragment[], returnType: CodeFragment[]) => void, implReturnGen: (code: CodeBuilder, funcopName: string, funcopDefs: F[]) => void, isDeno: boolean): void;
export declare function generateFuncopDef(funcopDef: FuncopDefOverload<FuncopDef>): string;
export declare function generateReturnCardinality(name: string, params: GroupedParams, returnTypemod: Typemod, hasNamedParams: boolean, anytypes: AnytypeDef | null, preservesOptionality?: boolean): string;
