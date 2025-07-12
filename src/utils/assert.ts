export function assert(condition: unknown): asserts condition {
    if (!condition) throw new Error("Condition assertion failed");
}

export function assertNonNull<T>(value: T | null | undefined): asserts value is T {
    if (value === null || value === undefined) throw new Error("Nonull assertion failed");
}
