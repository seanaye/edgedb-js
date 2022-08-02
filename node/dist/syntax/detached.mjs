import { ExpressionKind } from "../reflection/index";
import { $expressionify } from "./path";
export function detached(expr) {
    return $expressionify({
        __element__: expr.__element__,
        __cardinality__: expr.__cardinality__,
        __expr__: expr,
        __kind__: ExpressionKind.Detached,
    });
}
