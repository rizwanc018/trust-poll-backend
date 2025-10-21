import { LAMPORTS_PER_SOL, Connection, clusterApiUrl } from "@solana/web3.js";

export const USER_JWT_SECRET = process.env.JWT_SECRET as string;
export const WORKER_JWT_SECRET = (process.env.JWT_SECRET as string) + "worker";
export const JWT_EXPIRATION = "1d";

export const TOTAL_DECIMALS = 1000_000_000;

export const TOTAL_SUBMISSIONS = 100;

export const OWNER_ADDRESS = process.env.OWNER_ADDRESS as string;
export const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY as string;

export const TASK_AMOUNT = 0.1 * LAMPORTS_PER_SOL;

export const SOLANA_NETWORK = process.env.SOLANA_NETWORK as "devnet" | "testnet" | "mainnet-beta";

console.log("Connecting to Solana...", SOLANA_NETWORK);
export const solanaConnection = new Connection(clusterApiUrl(SOLANA_NETWORK), "confirmed");
console.log("Connection created.");
