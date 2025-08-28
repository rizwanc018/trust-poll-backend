import { Connection,  clusterApiUrl } from "@solana/web3.js";
import type { Blockhash, TransactionConfirmationStrategy, ParsedInstruction } from "@solana/web3.js";
import { OWNER_ADDRESS, TASK_AMOUNT } from "../config.js";

export const verifyTransaction = async (
    signature: string,
    blockhash: Blockhash,
    lastValidBlockHeight: number,
    expectedSender?: string,
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

        const parsedTransaction = await connection.getParsedTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        });

        if (!parsedTransaction) {
            return { confirmed: false, error: "Transaction not found" };
        }

        const transferInstruction = parsedTransaction.transaction.message.instructions.find(
            (instruction): instruction is ParsedInstruction => 
                'parsed' in instruction && 
                instruction.parsed?.type === "transfer" && 
                instruction.parsed?.info
        );


        if (!transferInstruction) {
            return {
                confirmed: false,
                error: "No transfer instruction found in transaction",
            };
        }

        const { source, destination, lamports } = transferInstruction.parsed.info;

        const verificationDetails = {
            sender: source,
            recipient: destination,
            amount: lamports,
            verified: true,
        };

        if (expectedSender && source !== expectedSender) {
            verificationDetails.verified = false;
            return {
                confirmed: true,
                verified: false,
                error: `Sender mismatch: expected ${expectedSender}, got ${source}`,
                details: verificationDetails,
            };
        }

        if (OWNER_ADDRESS && destination !== OWNER_ADDRESS) {
            verificationDetails.verified = false;
            return {
                confirmed: true,
                verified: false,
                error: `Recipient mismatch: expected ${OWNER_ADDRESS}, got ${destination}`,
                details: verificationDetails,
            };
        }

        if (TASK_AMOUNT && lamports !== TASK_AMOUNT) {
            verificationDetails.verified = false;
            return {
                confirmed: true,
                verified: false,
                error: `Amount mismatch: expected ${TASK_AMOUNT}, got ${lamports}`,
                details: verificationDetails,
            };
        }

        return {
            confirmed: true,
            verified: true,
            result,
            details: verificationDetails,
        };
    } catch (error) {
        console.error("Transaction confirmation failed:", error);
        return { confirmed: false, error };
    }
};
