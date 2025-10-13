import { PublicKey } from "@solana/web3.js";

import bs58 from "bs58";
import nacl from "tweetnacl";
import { prismaClient } from "../lib/prisma.js";

export const getNextTaskForWorker = async (workerId: string) => {
    return prismaClient.task.findFirst({
        where: {
            done: false,
            Submissions: {
                none: {
                    worker_id: workerId,
                },
            },
        },
        include: {
            Options: true,
        },
    });
};

export const verifySignature = async (publicKeyString: string, signature: Uint8Array, message: string) => {
    try {
        // Convert the public key string to PublicKey object
        const publicKey = new PublicKey(publicKeyString);

        // Encode the message the same way as frontend
        const messageBytes = new TextEncoder().encode(message);

        // Convert signature from Uint8Array or base58 if needed
        const signatureBytes = signature instanceof Uint8Array ? signature : bs58.decode(signature);

        // Verify the signature using nacl
        const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());

        return verified;
    } catch (error) {
        console.error("Signature verification failed:", error);
        return false;
    }
};
