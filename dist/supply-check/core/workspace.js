/**
 * The check of a pnpm-workspace.yaml against lean-code's template and the approved exceptions.
 *
 * workspaceHits: the hits of a workspace's globs, catalogs and settings.
 *
 * @example const hits = await workspaceHits(file, context);
 */
import { STRUCTURE } from "./fields.js";
import { faultHits, hitOf, schemaHits, wholeHit } from "./hits.js";
import { yamlOf } from "./parse.js";
import { folderOf, landing } from "./paths.js";
import { UNALLOWED_VALUE, UNKNOWN_SETTING } from "./reasons.js";
import { registryFault } from "./specifier.js";
import { WorkspaceSchema } from "./supply.schema.js";
import { isTemplateFile, TEMPLATE } from "./template.js";
import { isList, isMap, isSame } from "./values.js";
/**
 * A pnpm-workspace.yaml: globs that stay in the repository, catalog values from the registry, and
 * every other key a setting of the template with a value it allows, none of its own left out.
 */
export const workspaceHits = async ({ path, text }, { settings: allowed }) => {
    const documents = await yamlOf(text);
    if (typeof documents === 'string')
        return [wholeHit(path, documents)];
    if (documents.length > 1)
        return [wholeHit(path, `${documents.length} YAML documents, and pnpm reads one`)];
    const parsed = WorkspaceSchema.safeParse(documents[0] ?? {});
    if (parsed.success === false)
        return schemaHits(path, parsed.error.issues, documents[0]);
    if (isTemplateFile(path))
        return templateHits(path, parsed.data);
    const { packages = [], catalog = {}, catalogs = {} } = parsed.data;
    const settings = settingsOf(parsed.data);
    const catalogued = [
        ...Object.entries(catalog).map(([name, value]) => ({ field: ['catalog', name], value })),
        ...Object.entries(catalogs).flatMap(([group, entries]) => Object.entries(entries).map(([name, value]) => ({ field: ['catalogs', group, name], value }))),
    ];
    return [
        ...packages.flatMap((glob, i) => faultHits(path, ['packages', i], glob, globFault(folderOf(path), glob))),
        ...catalogued.flatMap(({ field, value }) => faultHits(path, field, value, registryFault(value))),
        ...Object.entries(settings).flatMap(([key, value]) => settingHits(path, key, value, allowed)),
        ...Object.keys(TEMPLATE.settings)
            .filter(key => Object.hasOwn(settings, key) === false)
            .map(key => hitOf(path, [key], undefined, 'a setting of the template left out')),
    ];
};
// templates/repo's own pnpm-workspace.yaml: the template's settings exactly, and no other key.
const templateHits = (file, workspace) => {
    const keys = [...new Set([...Object.keys(workspace), ...Object.keys(TEMPLATE.settings)])];
    return keys.flatMap(key => isSame(workspace[key], TEMPLATE.settings[key])
        ? []
        : [
            hitOf(file, [key], workspace[key], 'differs from the template in supply-check/core/template.ts of @honeyglass/actions'),
        ]);
};
const settingsOf = (workspace) => Object.fromEntries(Object.entries(workspace).filter(([key]) => STRUCTURE.includes(key) === false));
// A glob of plain characters only, so no brace, extglob or class spells a '..' the text hides.
const globFault = (base, glob) => {
    if (GLOB.test(glob) === false)
        return 'a workspace glob of characters beyond A-Z a-z 0-9 . _ @ / * -';
    return landing(base, glob.replace(/^!/, '')) === undefined
        ? 'a workspace glob that leaves the repository'
        : undefined;
};
/**
 * A setting's hits: a key the template lacks, or each entry of a map or item of a list it does not
 * allow, since fewer approved builds or hoisted names only narrow the template; else its value.
 */
const settingHits = (file, key, value, allowed) => {
    if (Object.hasOwn(allowed, key) === false)
        return [hitOf(file, [key], value, UNKNOWN_SETTING)];
    const permitted = allowed[key];
    if (isMap(permitted) && isMap(value)) {
        return Object.entries(value).flatMap(([entry, item]) => Object.hasOwn(permitted, entry) && isSame(permitted[entry], item)
            ? []
            : [hitOf(file, [key, entry], item, UNALLOWED_VALUE)]);
    }
    if (isList(permitted) && isList(value)) {
        return value.flatMap((item, i) => permitted.some(one => isSame(one, item))
            ? []
            : [hitOf(file, [key, i], item, UNALLOWED_VALUE)]);
    }
    return isSame(permitted, value) ? [] : [hitOf(file, [key], value, UNALLOWED_VALUE)];
};
// A workspace glob of plain characters, with an optional leading '!'.
const GLOB = /^!?[A-Za-z0-9._@/*-]+$/;
