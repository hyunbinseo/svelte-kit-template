export type Failure<Code extends string = string> = { failure: Code };

export const fail = <Code extends string>(failure: Code): Failure<Code> => ({ failure });

export const isFailure = (value: unknown): value is Failure =>
	typeof value === 'object' && value !== null && 'failure' in value;
