import { Cardinality, ExpressionKind, makeType, } from "../reflection/index";
import { $expressionify } from "./path";
import { spec } from "@generated/__spec__";
export function literal(type, value) {
    return $expressionify({
        __element__: type,
        __cardinality__: Cardinality.One,
        __kind__: ExpressionKind.Literal,
        __value__: value,
    });
}
export const $nameMapping = new Map([
    ...[...spec.values()].map(type => [type.name, type.id]),
    ["std::number", "00000000-0000-0000-0000-0000000001ff"],
]);
export function $getType(id) {
    return makeType(spec, id, literal);
}
export function $getTypeByName(name) {
    return makeType(spec, $nameMapping.get(name), literal);
}
