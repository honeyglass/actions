/**
 * The check of a package.json against lean-code's template.
 *
 * manifestHits: the hits of a package.json's dependency values, settings and packageManager.
 *
 * @example const hits = await manifestHits(file, context);
 */
import { isRefusal, parseJson } from '@honeyglass/utils/ts';
import { DEPENDENCY_FIELDS, SETTING_FIELDS } from "./fields.js";
import { hitOf, schemaHits, valueHits, wholeHit } from "./hits.js";
import { folderOf } from "./paths.js";
import { UNALLOWED_VALUE, UNKNOWN_SETTING } from "./reasons.js";
import { specifierFault } from "./specifier.js";
import { JsonValueSchema, ManifestSchema } from "./supply.schema.js";
import { isTemplateFile, TEMPLATE } from "./template.js";
import { isMap } from "./values.js";
/**
 * A package.json: each dependency value a registry, workspace, catalog or in-repo source, no field
 * pnpm reads settings from, since the template holds none, and the template's packageManager.
 */
export const manifestHits = async ({ path, text }, { kindOf }) => {
    const json = await parseJson(text, JsonValueSchema);
    if (isRefusal(json))
        return [wholeHit(path, 'no JSON')];
    const parsed = ManifestSchema.safeParse(json);
    if (parsed.success === false)
        return schemaHits(path, parsed.error.issues, json);
    const manifest = parsed.data;
    const where = { base: folderOf(path), kindOf };
    const values = DEPENDENCY_FIELDS.flatMap(field => Object.entries(manifest[field] ?? {}).map(([name, value]) => ({
        field: [field, name],
        value,
        fault: (specifier) => specifierFault(specifier, where),
    })));
    return [
        ...(await valueHits(path, values)),
        ...SETTING_FIELDS.flatMap(field => settingFieldHits(path, manifest, field)),
        ...managerHits(path, manifest.packageManager),
    ];
};
// Each key of a package.json field the template lacks, such as `pnpm`, or the field when it holds no map.
const settingFieldHits = (file, manifest, field) => {
    if (Object.hasOwn(manifest, field) === false)
        return [];
    const value = manifest[field];
    if (isMap(value) === false)
        return [hitOf(file, [field], value, UNKNOWN_SETTING)];
    return Object.entries(value).map(([key, item]) => hitOf(file, [field, key], item, UNKNOWN_SETTING));
};
// The template's packageManager, or none; the template's own package.json must name it.
const managerHits = (file, packageManager) => {
    if (packageManager === TEMPLATE.packageManager)
        return [];
    if (packageManager === undefined && isTemplateFile(file) === false)
        return [];
    return [hitOf(file, ['packageManager'], packageManager, UNALLOWED_VALUE)];
};
