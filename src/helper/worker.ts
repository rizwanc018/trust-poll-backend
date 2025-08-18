import { PrismaClient } from "../generated/prisma/index.js";
const prismaClient = new PrismaClient();

export const getNextTaskForWorker = async (workerId: string) => {
    return prismaClient.task.findFirst({
        where: {
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
