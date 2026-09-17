import { customType } from 'drizzle-orm/sqlite-core';

// Epoch-seconds integer, matching Drizzle's `{ mode: 'timestamp' }` storage.
export const instant = customType<{ data: Temporal.Instant; driverData: number }>({
	dataType: () => 'integer',
	fromDriver: (value) => Temporal.Instant.fromEpochMilliseconds(value * 1000),
	toDriver: (value) => Math.floor(value.epochMilliseconds / 1000),
});

// ISO `YYYY-MM-DD` text.
export const plainDate = customType<{ data: Temporal.PlainDate; driverData: string }>({
	dataType: () => 'text',
	fromDriver: (value) => Temporal.PlainDate.from(value),
	toDriver: (value) => value.toString(),
});
