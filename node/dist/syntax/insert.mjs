import { Cardinality, ExpressionKind, TypeKind, } from "../reflection/index";
import { $expressionify, $getScopedExpr } from "./path";
import { cast } from "./cast";
import { set } from "./set";
import { literal } from "./literal";
import { $getTypeByName } from "./literal";
function unlessConflict(conflictGetter) {
    const expr = {
        __kind__: ExpressionKind.InsertUnlessConflict,
        __element__: this.__element__,
        __cardinality__: Cardinality.AtMostOne,
        __expr__: this,
    };
    if (!conflictGetter) {
        expr.__conflict__ = { on: null };
        return $expressionify(expr);
    }
    else {
        const scopedExpr = $getScopedExpr(this.__expr__);
        const conflict = conflictGetter(scopedExpr);
        expr.__conflict__ = conflict;
        if (conflict.else) {
            expr.__cardinality__ = conflict.else.__cardinality__;
            if (this.__element__.__name__ !== conflict.else.__element__.__name__) {
                expr.__element__ = $getTypeByName("std::Object");
            }
        }
        return $expressionify(expr);
    }
}
export function $insertify(expr) {
    expr.unlessConflict = unlessConflict.bind(expr);
    return expr;
}
export function $normaliseInsertShape(root, shape, isUpdate = false) {
    const newShape = {};
    for (const [key, _val] of Object.entries(shape)) {
        let val = _val;
        let setModify = null;
        if (isUpdate && _val != null && typeof _val === "object") {
            const valKeys = Object.keys(_val);
            if (valKeys.length === 1 &&
                (valKeys[0] === "+=" || valKeys[0] === "-=")) {
                val = _val[valKeys[0]];
                setModify = valKeys[0];
            }
        }
        const pointer = root.__element__.__pointers__[key];
        const isLinkProp = key[0] === "@";
        if (!pointer && !isLinkProp) {
            throw new Error(`Could not find property pointer for ${isUpdate ? "update" : "insert"} shape key: '${key}'`);
        }
        if (val === undefined)
            continue;
        if (val === null || val === void 0 ? void 0 : val.__kind__) {
            if (val.__kind__ === ExpressionKind.Literal &&
                val.__element__.__kind__ === TypeKind.range &&
                val.__element__.__element__.__name__ === "std::number") {
                newShape[key] = literal(pointer.target, val.__value__);
            }
            else {
                newShape[key] = _val;
            }
            continue;
        }
        if (isLinkProp) {
            throw new Error(`Cannot assign plain data to link property '${key}'. Provide an expression instead.`);
        }
        if (pointer.__kind__ !== "property" && val !== null) {
            throw new Error(`Must provide subquery when assigning to link '${key}' in ${isUpdate ? "update" : "insert"} query.`);
        }
        const isMulti = pointer.cardinality === Cardinality.AtLeastOne ||
            pointer.cardinality === Cardinality.Many;
        if (pointer.__kind__ === "property") {
            if (pointer.target.__name__ === "std::json") {
            }
        }
        const wrappedVal = val === null
            ? cast(pointer.target, null)
            : isMulti && Array.isArray(val)
                ? set(...val.map(v => literal(pointer.target, v)))
                : literal(pointer.target, val);
        newShape[key] = setModify
            ? { [setModify]: wrappedVal }
            : wrappedVal;
    }
    return newShape;
}
export function insert(root, shape) {
    if (typeof shape !== "object") {
        throw new Error(`invalid insert shape.${typeof shape === "function"
            ? " Hint: Insert shape is expected to be an object, " +
                "not a function returning a shape object."
            : ""}`);
    }
    const expr = {
        __kind__: ExpressionKind.Insert,
        __element__: root.__element__,
        __cardinality__: Cardinality.One,
        __expr__: root,
        __shape__: $normaliseInsertShape(root, shape),
    };
    expr.unlessConflict = unlessConflict.bind(expr);
    return $expressionify($insertify(expr));
}
