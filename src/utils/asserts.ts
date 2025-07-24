export function assert(condition: unknown): asserts condition {
    if (!condition) throw new Error("Assertion failed");
}

export function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
    if (value == null || value === undefined) throw new Error("NonNull assertion failed");
}
