export const JWT_SECRET = process.env.JWT_SECRET as string;
export const WORKER_JWT_SECRET = (process.env.JWT_SECRET as string) + "worker";

export const TOTAL_DECIMALS = 1000_000_000;
