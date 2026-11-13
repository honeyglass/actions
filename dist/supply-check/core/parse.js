/**
 * The documents of a YAML text as plain values, or why the check cannot read them.
 *
 * yamlOf: the one place the supply check reads YAML through the yaml package.
 *
 * pnpm writes no anchor, alias or merge key, and a merge key can hold a resolution beside the one
 * the check reads, so each refuses the file before a value is read. A reason names yaml's code
 * and position alone, never its message, as CI prints it.
 *
 * @example const documents = await yamlOf(text);
 */
import { $try, anyError } from '@honeyglass/utils/ts';
import { isScalar, parseAllDocuments, visit } from 'yaml';
// The documents of a YAML text as plain values, or why the check cannot read them; reading one
// nested past the stack throws, and counts as unreadable.
export const yamlOf = (text) => $try(() => valuesOf(text), { or: 'YAML the check could not read whole', expected: anyError });
const valuesOf = (text) => {
    const documents = parseAllDocuments(text, { merge: false });
    const [error] = documents.flatMap(document => document.errors);
    if (error !== undefined)
        return `YAML with an error (${codeAt(error)})`;
    const [shortcut] = documents.flatMap(document => shortcutsIn(document));
    if (shortcut !== undefined)
        return `YAML with ${shortcut}, which pnpm never writes`;
    return documents.map(document => {
        const value = document.toJS();
        return value;
    });
};
// A YAML error by yaml's closed fields, its code and where it starts. Its message quotes the text,
// which CI prints, so a CR there could start a line GitHub's runner reads as a workflow command.
const codeAt = ({ code, linePos, }) => {
    const start = linePos?.[0];
    return start === undefined ? code : `${code} at line ${start.line}, column ${start.col}`;
};
/**
 * The anchors, aliases and merge keys of a document, YAML's ways to let one value stand twice.
 *
 * pnpm writes none, and a merge key can hold a resolution beside the one the check reads, so each
 * refuses the file before a value is read. Their names stay out of the hit, which CI prints.
 */
const shortcutsIn = (document) => {
    const found = [];
    visit(document, {
        Alias: () => {
            found.push('an alias');
        },
        Node: (_, node) => {
            if (node.anchor !== undefined)
                found.push('an anchor');
        },
        Pair: (_, pair) => {
            if (isScalar(pair.key) && pair.key.value === '<<')
                found.push('a merge key <<');
        },
    });
    return found;
};
