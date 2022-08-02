import { Cardinality, cardinalityUtil, ExpressionKind, TypeKind, } from "../reflection/index";
import { $expressionify } from "./path";
import { literalToTypeSet, } from "@generated/castMaps";
const indexSliceRegx = /^(-?\d+)(?:(:)(-?\d+)?)?|:(-?\d+)$/;
const arrayLikeProxyHandlers = {
    get(target, prop, proxy) {
        var _a;
        const match = typeof prop === "string" ? prop.match(indexSliceRegx) : null;
        if (match) {
            const start = match[1];
            const end = (_a = match[3]) !== null && _a !== void 0 ? _a : match[4];
            const isIndex = start && !match[2];
            return $expressionify({
                __kind__: ExpressionKind.Operator,
                __element__: target.__element__.__kind__ === TypeKind.array && isIndex
                    ? target.__element__.__element__
                    : target.__element__,
                __cardinality__: target.__cardinality__,
                __name__: "[]",
                __opkind__: "Infix",
                __args__: [
                    proxy,
                    isIndex
                        ? literalToTypeSet(Number(start))
                        : [
                            start && literalToTypeSet(Number(start)),
                            end && literalToTypeSet(Number(end)),
                        ],
                ],
            });
        }
        return target[prop];
    },
};
function arrayLikeIndex(index) {
    const indexTypeSet = literalToTypeSet(index);
    return $expressionify({
        __kind__: ExpressionKind.Operator,
        __element__: this.__element__.__kind__ === TypeKind.array
            ? this.__element__.__element__
            : this.__element__,
        __cardinality__: cardinalityUtil.multiplyCardinalities(this.__cardinality__, indexTypeSet.__cardinality__),
        __name__: "[]",
        __opkind__: "Infix",
        __args__: [this, indexTypeSet],
    });
}
function arrayLikeSlice(start, end) {
    var _a, _b;
    const startTypeSet = start && literalToTypeSet(start);
    const endTypeSet = end && literalToTypeSet(end);
    return $expressionify({
        __kind__: ExpressionKind.Operator,
        __element__: this.__element__,
        __cardinality__: cardinalityUtil.multiplyCardinalities(cardinalityUtil.multiplyCardinalities(this.__cardinality__, (_a = startTypeSet === null || startTypeSet === void 0 ? void 0 : startTypeSet.__cardinality__) !== null && _a !== void 0 ? _a : Cardinality.One), (_b = endTypeSet === null || endTypeSet === void 0 ? void 0 : endTypeSet.__cardinality__) !== null && _b !== void 0 ? _b : Cardinality.One),
        __name__: "[]",
        __opkind__: "Infix",
        __args__: [this, [startTypeSet, endTypeSet]],
    });
}
export function $arrayLikeIndexify(_expr) {
    if (_expr.__element__.__kind__ === TypeKind.array ||
        (_expr.__element__.__kind__ === TypeKind.scalar &&
            (_expr.__element__.__name__ === "std::str" ||
                _expr.__element__.__name__ === "std::bytes"))) {
        const expr = new Proxy(_expr, arrayLikeProxyHandlers);
        expr.index = arrayLikeIndex.bind(expr);
        expr.slice = arrayLikeSlice.bind(expr);
        return expr;
    }
    return _expr;
}
export function array(arg) {
    if (Array.isArray(arg)) {
        const items = arg.map(a => literalToTypeSet(a));
        return $expressionify({
            __kind__: ExpressionKind.Array,
            __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic(items.map(item => item.__cardinality__)),
            __element__: {
                __kind__: TypeKind.array,
                __name__: `array<${items[0].__element__.__name__}>`,
                __element__: items[0].__element__,
            },
            __items__: items,
        });
    }
    if (arg.__kind__) {
        return {
            __kind__: TypeKind.array,
            __name__: `array<${arg.__name__}>`,
            __element__: arg,
        };
    }
    throw new Error("Invalid array input.");
}
const tupleProxyHandlers = {
    get(target, prop, proxy) {
        const type = target.__element__;
        const items = type.__kind__ === TypeKind.tuple
            ? type.__items__
            : type.__kind__ === TypeKind.namedtuple
                ? type.__shape__
                : null;
        return (items === null || items === void 0 ? void 0 : items.hasOwnProperty(prop))
            ? tuplePath(proxy, items[prop], prop)
            : target[prop];
    },
};
export function $tuplePathify(expr) {
    if (expr.__element__.__kind__ !== TypeKind.tuple &&
        expr.__element__.__kind__ !== TypeKind.namedtuple) {
        return expr;
    }
    return new Proxy(expr, tupleProxyHandlers);
}
function tuplePath(parent, itemType, index) {
    return $expressionify({
        __kind__: ExpressionKind.TuplePath,
        __element__: itemType,
        __cardinality__: parent.__cardinality__,
        __parent__: parent,
        __index__: index,
    });
}
function makeTupleType(name, items) {
    return {
        __kind__: TypeKind.tuple,
        __name__: name,
        __items__: items,
    };
}
const typeKinds = new Set(Object.values(TypeKind));
export function tuple(input) {
    if (Array.isArray(input)) {
        if (input.every(item => typeKinds.has(item.__kind__))) {
            const typeItems = input;
            const typeName = `tuple<${typeItems
                .map(item => item.__name__)
                .join(", ")}>`;
            return makeTupleType(typeName, typeItems);
        }
        const items = input.map(item => literalToTypeSet(item));
        const name = `tuple<${items
            .map(item => item.__element__.__name__)
            .join(", ")}>`;
        return $expressionify({
            __kind__: ExpressionKind.Tuple,
            __element__: makeTupleType(name, items.map(item => item.__element__)),
            __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic(items.map(i => i.__cardinality__)),
            __items__: items,
        });
    }
    else {
        if (Object.values(input).every((el) => typeKinds.has(el.__kind__))) {
            const typeName = `tuple<${Object.entries(input)
                .map(([key, val]) => `${key}: ${val.__name__}`)
                .join(", ")}>`;
            return {
                __kind__: TypeKind.namedtuple,
                __name__: typeName,
                __shape__: input,
            };
        }
        const exprShape = {};
        const typeShape = {};
        for (const [key, val] of Object.entries(input)) {
            exprShape[key] = literalToTypeSet(val);
            typeShape[key] = exprShape[key].__element__;
        }
        const name = `tuple<${Object.entries(exprShape)
            .map(([key, val]) => `${key}: ${val.__element__.__name__}`)
            .join(", ")}>`;
        return $expressionify({
            __kind__: ExpressionKind.NamedTuple,
            __element__: {
                __kind__: TypeKind.namedtuple,
                __name__: name,
                __shape__: typeShape,
            },
            __cardinality__: cardinalityUtil.multiplyCardinalitiesVariadic(Object.values(exprShape).map(val => val.__cardinality__)),
            __shape__: exprShape,
        });
    }
}
