/**
 * lean-code's template of pnpm settings, and the exceptions the person approved beside it.
 *
 * TEMPLATE: the settings every pnpm-workspace.yaml holds, and the packageManager.
 * EXCEPTIONS, widened: the approved exceptions by repository, and the settings they widen.
 * isTemplateFile: whether a file lies in lean-code's templates/repo, which holds TEMPLATE exactly.
 *
 * The template lives here as code, with the check's own trust, so no file the check reads can
 * widen what it allows. Only the person widens EXCEPTIONS.
 *
 * @example const settings = widened(TEMPLATE.settings, EXCEPTIONS.get(repository) ?? {});
 */
import { folded, folderOf } from "./paths.js";
import { isList, isMap } from "./values.js";
/**
 * lean-code's template: the settings every pnpm-workspace.yaml holds, and the packageManager.
 *
 * lean-code's templates/repo/ holds the same for make-repo to copy, and the check refuses a commit
 * of it that differs in any key or value, so the two cannot part.
 */
export const TEMPLATE = {
    settings: {
        minimumReleaseAge: 4320,
        allowBuilds: {},
        strictDepBuilds: true,
        blockExoticSubdeps: true,
        trustPolicy: 'no-downgrade',
        // pnpm loads no pnpmfile, whose code would run at every install, wherever one lies
        ignorePnpmfile: true,
    },
    packageManager: 'pnpm@12.9.0+sha512.8f64efa0b792986ca98ae568791bcd7722807e274c4f0c1d9853c62116495c584119db98762a2a5343b1684d361b9ae26fdd16d551666d7635346d3fae830ddd',
};
// The template's own files, which must hold the template exactly.
const TEMPLATE_FOLDER = 'templates/repo';
// The exceptions the person approved beside the template, by repository
// (lean-code's 'plannings/plans/supply-chain/plan.md' section 7); each widens one of its settings.
export const EXCEPTIONS = new Map([
    [
        'honeyglass/blog',
        { allowBuilds: { esbuild: true, sharp: true, workerd: true }, publicHoistPattern: ['cookie'] },
    ],
    // its builds wait for the install that shows them
    ['honeyglass/mock.man', {}],
]);
// Each setting with its exception merged in: a list's items and a map's entries added, any other value replaced.
export const widened = (settings, exceptions) => {
    const keys = [...new Set([...Object.keys(settings), ...Object.keys(exceptions)])];
    return Object.fromEntries(keys.map(key => {
        const [base, extra] = [settings[key], exceptions[key]];
        if (extra === undefined)
            return [key, base];
        if (isList(base) && isList(extra))
            return [key, [...base, ...extra]];
        if (isMap(base) && isMap(extra))
            return [key, { ...base, ...extra }];
        return [key, extra];
    }));
};
export const isTemplateFile = (path) => folded(folderOf(path)) === TEMPLATE_FOLDER;
