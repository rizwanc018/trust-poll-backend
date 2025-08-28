import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import type { Blockhash, TransactionConfirmationStrategy } from "@solana/web3.js";

export const verifyTransaction = async (
    signature: string,
    blockhash: Blockhash,
    lastValidBlockHeight: number
) => {
    try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

        const strategy: TransactionConfirmationStrategy = {
            signature: signature,
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight,
        };

        const result = await connection.confirmTransaction(strategy, "confirmed");
        
        if (result.value.err) {
            console.error("Transaction failed:", result.value.err);
            return { confirmed: false, error: result.value.err };
        }
        
        return { confirmed: true, result };
    } catch (error) {
        console.error("Transaction confirmation failed:", error);
        return { confirmed: false, error };
    }
};
