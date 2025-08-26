export const USER_JWT_SECRET = process.env.JWT_SECRET as string;
export const WORKER_JWT_SECRET = (process.env.JWT_SECRET as string) + "worker";
export const JWT_EXPIRATION = "1d";

export const TOTAL_DECIMALS = 1000_000_000;

