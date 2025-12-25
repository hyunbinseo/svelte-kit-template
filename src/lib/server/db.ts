type LoginAttempt = {
	id: string;
	code: string;
	createdAt: number;
	expiresAt: number;
	attempts?: number;
};

export const mockDB = new Map<string, LoginAttempt>();
