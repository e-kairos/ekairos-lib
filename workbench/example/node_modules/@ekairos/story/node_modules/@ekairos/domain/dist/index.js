"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domain = domain;
const core_1 = require("@instantdb/core");
function domain(def) {
    function schema() {
        return core_1.i.schema({
            entities: def.entities,
            links: def.links,
            rooms: def.rooms,
        });
    }
    function compose(other) {
        const otherDef = ("schema" in other)
            ? { entities: other.entities, links: other.links, rooms: other.rooms }
            : other;
        const mergedEntities = { ...def.entities, ...otherDef.entities };
        const mergedLinks = { ...def.links, ...otherDef.links };
        const mergedRooms = { ...def.rooms, ...otherDef.rooms };
        return domain({
            entities: mergedEntities,
            links: mergedLinks,
            rooms: mergedRooms,
        });
    }
    return {
        entities: def.entities,
        links: def.links,
        rooms: def.rooms,
        schema,
        compose,
    };
}
//# sourceMappingURL=index.js.map