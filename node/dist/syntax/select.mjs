import { LocalDateTime, LocalDate, LocalTime, Duration, RelativeDuration, ConfigMemory, DateDuration, } from "edgedb";
import { Cardinality, cardinalityUtil, ExpressionKind, makeType, TypeKind, } from "../reflection/index";
import { $expressionify, $getScopedExpr } from "./path";
import { $getTypeByName, literal } from "./literal";
import { spec } from "@generated/__spec__";
import { literalToTypeSet, } from "@generated/castMaps";
export const ASC = "ASC";
export const DESC = "DESC";
export const EMPTY_FIRST = "EMPTY FIRST";
export const EMPTY_LAST = "EMPTY LAST";
export function is(expr, shape) {
    const mappedShape = {};
    for (const [key, value] of Object.entries(shape)) {
        mappedShape[key] = {
            __kind__: ExpressionKind.PolyShapeElement,
            __polyType__: expr,
            __shapeElement__: value,
        };
    }
    return mappedShape;
}
function computeFilterCardinality(expr, cardinality, base) {
    var _a, _b, _c;
    let card = cardinality;
    const filter = expr;
    const baseIsObjectExpr = ((_a = base === null || base === void 0 ? void 0 : base.__element__) === null || _a === void 0 ? void 0 : _a.__kind__) === TypeKind.object;
    const filterExprIsEq = filter.__kind__ === ExpressionKind.Operator && filter.__name__ === "=";
    const arg0 = (_b = filter === null || filter === void 0 ? void 0 : filter.__args__) === null || _b === void 0 ? void 0 : _b[0];
    const arg1 = (_c = filter === null || filter === void 0 ? void 0 : filter.__args__) === null || _c === void 0 ? void 0 : _c[1];
    const argsExist = !!arg0 && !!arg1 && !!arg1.__cardinality__;
    const arg0IsUnique = (arg0 === null || arg0 === void 0 ? void 0 : arg0.__exclusive__) === true;
    if (baseIsObjectExpr && filterExprIsEq && argsExist && arg0IsUnique) {
        const newCard = arg1.__cardinality__ === Cardinality.One ||
            arg1.__cardinality__ === Cardinality.AtMostOne
            ? Cardinality.AtMostOne
            : arg1.__cardinality__ === Cardinality.Empty
                ? Cardinality.Empty
                : cardinality;
        if (arg0.__kind__ === ExpressionKind.PathLeaf) {
            const arg0ParentMatchesBase = arg0.__parent__.type.__element__.__name__ ===
                base.__element__.__name__;
            if (arg0ParentMatchesBase) {
                card = newCard;
            }
        }
        else if (arg0.__kind__ === ExpressionKind.PathNode) {
            const parent = arg0.__parent__;
            if (parent === null) {
                const arg0MatchesBase = arg0.__element__.__name__ === base.__element__.__name__;
                if (arg0MatchesBase) {
                    card = newCard;
                }
            }
            else {
                const arg0ParentMatchesBase = (parent === null || parent === void 0 ? void 0 : parent.type.__element__.__name__) === base.__element__.__name__;
                if (arg0ParentMatchesBase) {
                    card = newCard;
                }
            }
        }
    }
    return card;
}
export function $handleModifiers(modifiers, rootExpr) {
    const mods = { ...modifiers };
    let card = rootExpr.__cardinality__;
    if (mods.filter && rootExpr.__element__.__kind__ === TypeKind.object) {
        card = computeFilterCardinality(mods.filter, card, rootExpr);
    }
    if (mods.order_by) {
        const orderExprs = Array.isArray(mods.order_by)
            ? mods.order_by
            : [mods.order_by];
        mods.order_by = orderExprs.map(expr => typeof expr.__element__ === "undefined"
            ? expr
            : { expression: expr });
    }
    if (mods.offset) {
        mods.offset =
            typeof mods.offset === "number"
                ? $getTypeByName("std::number")(mods.offset)
                : mods.offset;
        card = cardinalityUtil.overrideLowerBound(card, "Zero");
    }
    if (mods.limit) {
        let expr = mods.limit;
        if (typeof expr === "number") {
            expr = $getTypeByName("std::number")(expr);
        }
        else if (expr.__kind__ === ExpressionKind.Set) {
            expr = expr.__exprs__[0];
        }
        mods.limit = expr;
        card = cardinalityUtil.overrideLowerBound(card, "Zero");
    }
    return { modifiers: mods, cardinality: card };
}
function deleteExpr(expr, modifiersGetter) {
    const selectExpr = select(expr, modifiersGetter);
    return $expressionify({
        __kind__: ExpressionKind.Delete,
        __element__: selectExpr.__element__,
        __cardinality__: selectExpr.__cardinality__,
        __expr__: selectExpr,
    });
}
export { deleteExpr as delete };
export function $selectify(expr) {
    return expr;
}
const $FreeObject = makeType(spec, [...spec.values()].find(s => s.name === "std::FreeObject").id, literal);
const FreeObject = {
    __kind__: ExpressionKind.PathNode,
    __element__: $FreeObject,
    __cardinality__: Cardinality.One,
    __parent__: null,
    __exclusive__: true,
    __scopeRoot__: null,
};
export const $existingScopes = new Set();
export function select(...args) {
    const firstArg = args[0];
    if (typeof firstArg !== "object" ||
        firstArg instanceof Buffer ||
        firstArg instanceof Date ||
        firstArg instanceof Duration ||
        firstArg instanceof LocalDateTime ||
        firstArg instanceof LocalDate ||
        firstArg instanceof LocalTime ||
        firstArg instanceof RelativeDuration ||
        firstArg instanceof DateDuration ||
        firstArg instanceof ConfigMemory) {
        const literalExpr = literalToTypeSet(firstArg);
        return $expressionify($selectify({
            __kind__: ExpressionKind.Select,
            __element__: literalExpr.__element__,
            __cardinality__: literalExpr.__cardinality__,
            __expr__: literalExpr,
            __modifiers__: {},
        }));
    }
    const exprPair = typeof args[0].__element__ !== "undefined"
        ? args
        : [FreeObject, () => args[0]];
    let expr = exprPair[0];
    const shapeGetter = exprPair[1];
    if (expr === FreeObject) {
        const freeObjectPtrs = {};
        for (const [k, v] of Object.entries(args[0])) {
            freeObjectPtrs[k] = {
                __kind__: v.__element__.__kind__ === TypeKind.object ? "link" : "property",
                target: v.__element__,
                cardinality: v.__cardinality__,
                exclusive: false,
                computed: true,
                readonly: true,
                hasDefault: false,
                properties: {},
            };
        }
        expr = {
            ...FreeObject,
            __element__: {
                ...FreeObject.__element__,
                __pointers__: {
                    ...FreeObject.__element__.__pointers__,
                    ...freeObjectPtrs,
                },
            },
        };
    }
    if (!shapeGetter) {
        if (expr.__element__.__kind__ === TypeKind.object) {
            const objectExpr = expr;
            return $expressionify($selectify({
                __kind__: ExpressionKind.Select,
                __element__: {
                    __kind__: TypeKind.object,
                    __name__: `${objectExpr.__element__.__name__}`,
                    __pointers__: objectExpr.__element__.__pointers__,
                    __shape__: objectExpr.__element__.__shape__,
                },
                __cardinality__: objectExpr.__cardinality__,
                __expr__: objectExpr,
                __modifiers__: {},
            }));
        }
        else {
            return $expressionify($selectify({
                __kind__: ExpressionKind.Select,
                __element__: expr.__element__,
                __cardinality__: expr.__cardinality__,
                __expr__: expr,
                __modifiers__: {},
            }));
        }
    }
    const cleanScopedExprs = $existingScopes.size === 0;
    const { modifiers: mods, shape, scope } = resolveShape(shapeGetter, expr);
    if (cleanScopedExprs) {
        $existingScopes.clear();
    }
    const { modifiers, cardinality } = $handleModifiers(mods, expr);
    return $expressionify($selectify({
        __kind__: ExpressionKind.Select,
        __element__: expr.__element__.__kind__ === TypeKind.object
            ? {
                __kind__: TypeKind.object,
                __name__: `${expr.__element__.__name__}`,
                __pointers__: expr.__element__.__pointers__,
                __shape__: shape,
            }
            : expr.__element__,
        __cardinality__: cardinality,
        __expr__: expr,
        __modifiers__: modifiers,
        __scope__: expr !== scope
            ? scope
            : undefined,
    }));
}
function resolveShape(shapeGetter, expr) {
    const modifiers = {};
    const shape = {};
    const scope = expr.__element__.__kind__ === TypeKind.object
        ? $getScopedExpr(expr, $existingScopes)
        : expr;
    const selectShape = typeof shapeGetter === "function" ? shapeGetter(scope) : shapeGetter;
    for (const [key, value] of Object.entries(selectShape)) {
        if (key === "filter" ||
            key === "order_by" ||
            key === "offset" ||
            key === "limit") {
            modifiers[key] = value;
        }
        else {
            if (expr.__element__.__kind__ !== TypeKind.object) {
                throw new Error(`Invalid select shape key '${key}' on scalar expression, ` +
                    `only modifiers are allowed (filter, order_by, offset and limit)`);
            }
            shape[key] = resolveShapeElement(key, value, scope);
        }
    }
    return { shape, modifiers, scope };
}
export function resolveShapeElement(key, value, scope) {
    var _a, _b, _c, _d, _e;
    const isSubshape = typeof value === "object" &&
        typeof value.__kind__ === "undefined";
    const isClosure = typeof value === "function" &&
        ((_a = scope.__element__.__pointers__[key]) === null || _a === void 0 ? void 0 : _a.__kind__) === "link";
    if (isSubshape || isClosure) {
        const childExpr = scope[key];
        if (!childExpr) {
            throw new Error(`Invalid shape element "${key}" for type ${scope.__element__.__name__}`);
        }
        const { shape: childShape, scope: childScope, modifiers: mods, } = resolveShape(value, childExpr);
        const { modifiers } = $handleModifiers(mods, childExpr);
        return {
            __kind__: ExpressionKind.Select,
            __element__: {
                __kind__: TypeKind.object,
                __name__: `${childExpr.__element__.__name__}`,
                __pointers__: childExpr.__element__.__pointers__,
                __shape__: childShape,
            },
            __cardinality__: ((_c = (_b = scope.__element__.__pointers__) === null || _b === void 0 ? void 0 : _b[key]) === null || _c === void 0 ? void 0 : _c.cardinality) ||
                ((_e = (_d = scope.__element__.__shape__) === null || _d === void 0 ? void 0 : _d[key]) === null || _e === void 0 ? void 0 : _e.__cardinality__),
            __expr__: childExpr,
            __modifiers__: modifiers,
            __scope__: childExpr !== childScope ? childScope : undefined,
        };
    }
    else if ((value === null || value === void 0 ? void 0 : value.__kind__) === ExpressionKind.PolyShapeElement) {
        const polyElement = value;
        const polyScope = scope.is(polyElement.__polyType__);
        return {
            __kind__: ExpressionKind.PolyShapeElement,
            __polyType__: polyScope,
            __shapeElement__: resolveShapeElement(key, polyElement.__shapeElement__, polyScope),
        };
    }
    else if (typeof value === "boolean" && key.startsWith("@")) {
        const linkProp = scope[key];
        if (!linkProp) {
            throw new Error(scope.__parent__
                ? `link property '${key}' does not exist on link ${scope.__parent__.linkName}`
                : `cannot select link property '${key}' on an object (${scope.__element__.__name__})`);
        }
        return value ? linkProp : false;
    }
    else {
        return value;
    }
}
