/**
 * lean-code's template: the settings every pnpm-workspace.yaml holds, and the packageManager.
 *
 * lean-code's templates/repo/ holds the same for make-repo to copy, and the check refuses a commit
 * of it that differs in any key or value, so the two cannot part.
 */
export declare const TEMPLATE: {
    settings: Readonly<Record<string, unknown>>;
    packageManager: string;
};
export declare const EXCEPTIONS: Map<string, Record<string, unknown>>;
export declare const widened: (settings: Readonly<Record<string, unknown>>, exceptions: Record<string, unknown>) => {
    [k: string]: unknown;
};
export declare const isTemplateFile: (path: string) => boolean;
