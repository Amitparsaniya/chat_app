import { z } from "zod";

const id = z.string().trim().min(1).max(128);
export const chatParamsSchema = z.object({ chatId: id });
export const chatMessageParamsSchema = z.object({ chatId: id, messageId: id });
export const userParamsSchema = z.object({ userId: id });

export const createChatSchema = z.object({
  userAId: id,
  userBId: id
}).refine(v => v.userAId !== v.userBId, { message: "A direct chat requires two different users" });

export const sendMessageSchema = z.object({
  senderId: id,
  text: z.string().trim().min(1).max(10_000)
});
export const readMessageSchema = z.object({ userId: id });
export const lastSeenSchema = z.object({ userId: id, messageId: id });
export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime({ offset: true }).optional()
});
