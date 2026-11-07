// What a procedure returns: its values, or the guard that stopped it, see specs/06-query-layer.md
export type ProcedureResult<
	ErrorCode extends string,
	Values extends object = Record<never, never>,
> = (Values & { ok: true }) | { error: ErrorCode; ok: false };
