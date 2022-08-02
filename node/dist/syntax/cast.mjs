import { ExpressionKind, Cardinality, } from "../reflection/index";
import { $expressionify } from "./path";
import { literalToTypeSet } from "@generated/castMaps";
export function cast(target, expr) {
    const cleanedExpr = expr === null ? null : literalToTypeSet(expr);
    return $expressionify({
        __element__: target,
        __cardinality__: cleanedExpr === null ? Cardinality.Empty : cleanedExpr.__cardinality__,
        __expr__: cleanedExpr,
        __kind__: ExpressionKind.Cast,
    });
}
