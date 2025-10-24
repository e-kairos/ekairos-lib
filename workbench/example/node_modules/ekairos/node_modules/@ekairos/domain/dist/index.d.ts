import { i } from "@instantdb/core";
import type { EntitiesDef, LinksDef, RoomsDef, InstantSchemaDef } from "@instantdb/core";
export type DomainDefinition<E extends EntitiesDef, L extends LinksDef<any>, R extends RoomsDef> = {
    entities: E;
    links: L;
    rooms: R;
};
export type DomainInstance<E extends EntitiesDef, L extends LinksDef<any>, R extends RoomsDef> = DomainDefinition<E, L, R> & {
    schema: () => ReturnType<typeof i.schema>;
    compose: <E2 extends EntitiesDef, L2 extends LinksDef<E2>, R2 extends RoomsDef>(other: DomainInstance<E2, L2, R2> | DomainDefinition<E2, L2, R2>) => DomainInstance<E & E2, LinksDef<E & E2>, R & R2>;
};
export type SchemaOf<D extends DomainDefinition<any, any, any>> = InstantSchemaDef<D["entities"], LinksDef<D["entities"]>, D["rooms"]>;
export declare function domain<E extends EntitiesDef, L extends LinksDef<any>, R extends RoomsDef>(def: DomainDefinition<E, L, R>): DomainInstance<E, L, R>;
//# sourceMappingURL=index.d.ts.map