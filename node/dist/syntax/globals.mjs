import { ExpressionKind, } from "../reflection/index";
import { $expressionify } from "./path";
export function makeGlobal(name, type, card) {
    return $expressionify({
        __name__: name,
        __element__: type,
        __cardinality__: card,
        __kind__: ExpressionKind.Global,
    });
}
