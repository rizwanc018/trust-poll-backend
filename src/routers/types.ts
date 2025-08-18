import z from "zod";

export const createTaskInput = z.object({
    options: z
        .array(
            z.object({
                image_url: z.string(),
                subtitle: z.string().optional(),
            })
        )
        .min(2),
    title: z.string(),
    description: z.string().optional(),
    signature: z.string(),
});

export const createSubmissionInput = z.object({
    taskId: z.string(),
    selection: z.string(),
});
