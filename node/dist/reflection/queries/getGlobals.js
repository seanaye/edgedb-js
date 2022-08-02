"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobals = void 0;
async function getGlobals(cxn, params) {
    const globalsMap = new Map();
    if (params.version.major < 2) {
        return globalsMap;
    }
    const QUERY = `
    WITH
      MODULE schema
    SELECT schema::Global {
      id,
      name,
      target_id := .target.id,
      real_cardinality := ("One" IF .required ELSE "One" IF EXISTS .default ELSE "AtMostOne")
        IF <str>.cardinality = "One" ELSE
        ("AtLeastOne" IF .required ELSE "Many"),
      has_default := exists .default,
    }
    ORDER BY .name;
  `;
    const globals = JSON.parse(await cxn.queryJSON(QUERY));
    for (const g of globals) {
        globalsMap.set(g.id, g);
    }
    return globalsMap;
}
exports.getGlobals = getGlobals;
