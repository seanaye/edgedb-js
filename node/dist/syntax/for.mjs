import { Cardinality, ExpressionKind, cardinalityUtil, } from "../reflection/index";
import { $expressionify } from "./path";
function _for(set, expr) {
    const forVar = $expressionify({
        __kind__: ExpressionKind.ForVar,
        __element__: set.__element__,
        __cardinality__: Cardinality.One,
    });
    const returnExpr = expr(forVar);
    return $expressionify({
        __kind__: ExpressionKind.For,
        __element__: returnExpr.__element__,
        __cardinality__: cardinalityUtil.multiplyCardinalities(set.__cardinality__, returnExpr.__cardinality__),
        __iterSet__: set,
        __expr__: returnExpr,
        __forVar__: forVar,
    });
}
export { _for as for };
