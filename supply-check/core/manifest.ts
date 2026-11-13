/**
 * The check of a package.json against lean-code's template.
 *
 * manifestHits: the hits of a package.json's dependency values, settings and packageManager.
 *
 * @example const hits = await manifestHits(file, context);
 */
import { isRefusal, parseJson } from '@honeyglass/utils/ts';
import { DEPENDENCY_FIELDS, SETTING_FIELDS } from './fields.ts';
import { hitOf, schemaHits, valueHits, wholeHit } from './hits.ts';
import { folderOf } from './paths.ts';
import { UNALLOWED_VALUE, UNKNOWN_SETTING } from './reasons.ts';
import { specifierFault } from './specifier.ts';
import { JsonValueSchema, ManifestSchema } from './supply.schema.ts';
import { isTemplateFile, TEMPLATE } from './template.ts';
import type { Check } from './types.ts';
import { isMap } from './values.ts';

/**
 * A package.json: each dependency value a registry, workspace, catalog or in-repo source, no field
 * pnpm reads settings from, since the template holds none, and the template's packageManager.
 */
export const manifestHits: Check = async ({ path, text }, { kindOf }) => {
  const json = await parseJson(text, JsonValueSchema);
  if (isRefusal(json)) return [wholeHit(path, 'no JSON')];
  const parsed = ManifestSchema.safeParse(json);
  if (parsed.success === false) return schemaHits(path, parsed.error.issues, json);
  const manifest = parsed.data;
  const where = { base: folderOf(path), kindOf };
  const values = DEPENDENCY_FIELDS.flatMap(field =>
    Object.entries(manifest[field] ?? {}).map(([name, value]) => ({
      field: [field, name],
      value,
      fault: (specifier: string) => specifierFault(specifier, where),
    })),
  );
  return [
    ...(await valueHits(path, values)),
    ...SETTING_FIELDS.flatMap(field => settingFieldHits(path, manifest, field)),
    ...managerHits(path, manifest.packageManager),
  ];
};

// Each key of a package.json field the template lacks, such as `pnpm`, or the field when it holds no map.
const settingFieldHits = (file: string, manifest: Record<string, unknown>, field: string) => {
  if (Object.hasOwn(manifest, field) === false) return [];
  const value = manifest[field];
  if (isMap(value) === false) return [hitOf(file, [field], value, UNKNOWN_SETTING)];
  return Object.entries(value).map(([key, item]) =>
    hitOf(file, [field, key], item, UNKNOWN_SETTING),
  );
};

// The template's packageManager, or none; the template's own package.json must name it.
const managerHits = (file: string, packageManager: string | undefined) => {
  if (packageManager === TEMPLATE.packageManager) return [];
  if (packageManager === undefined && isTemplateFile(file) === false) return [];
  return [hitOf(file, ['packageManager'], packageManager, UNALLOWED_VALUE)];
};
