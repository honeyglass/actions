import type { SupplyHit } from '../types.ts';
import type { Issues } from './supply.schema.ts';
import type { Fault, Field, Found } from './types.ts';
export declare const valueHits: (file: string, values: {
    field: Field;
    value: string;
    fault: (value: string) => Fault | Promise<Fault>;
}[]) => Promise<Found[]>;
export declare const schemaHits: (file: string, issues: Issues, value: unknown) => SupplyHit[];
export declare const faultHits: (file: string, field: Field, value: unknown, fault: Fault) => Found[];
export declare const hitOf: (file: string, field: Field, value: unknown, reason: string) => SupplyHit;
export declare const wholeHit: (file: string, reason: string) => SupplyHit;
export declare const fieldOf: (path: Field) => string;
