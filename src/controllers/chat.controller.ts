import { Request, Response } from "express";
import { chatService } from "../services/chat.service";
import { chatRepository } from "../repositories/chat.repository";
import { AppError } from "../utils/app-error";
import {
  chatMessageParamsSchema, chatParamsSchema, createChatSchema, lastSeenSchema,
  listMessagesQuerySchema, readMessageSchema, sendMessageSchema, userParamsSchema
} from "../validators/chat.validators";

function requireAuthId(req: Request): string {
  if (!req.auth?.userId) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  return req.auth.userId;
}
function assertSameUser(authId: string, requestedId: string): void {
  if (authId !== requestedId) throw new AppError(403, "FORBIDDEN", "You can only act as the authenticated user");
}

export const createChat = async (req: Request, res: Response) => {
  const body = createChatSchema.parse(req.body);
  const authId = requireAuthId(req);
  if (authId !== body.userAId && authId !== body.userBId) {
    throw new AppError(403, "FORBIDDEN", "You must be a participant in this chat");
  }
  const data = await chatService.createOrGet(body.userAId, body.userBId);
  res.status(data.created ? 201 : 200).json({ success: true, data });
};

export const sendMessage = async (req: Request, res: Response) => {
  const body = sendMessageSchema.parse(req.body);
  const { chatId } = chatParamsSchema.parse(req.params);
  assertSameUser(requireAuthId(req), body.senderId);
  const data = await chatService.sendMessage(chatId, body.senderId, body.text);
  res.status(201).json({ success: true, data });
};

export const getMessages = async (req: Request, res: Response) => {
  const query = listMessagesQuerySchema.parse(req.query);
  const { chatId } = chatParamsSchema.parse(req.params);
  const data = await chatService.getMessages(chatId, requireAuthId(req), query.limit, query.before);
  res.status(200).json({ success: true, data });
};

export const markRead = async (req: Request, res: Response) => {
  const body = readMessageSchema.parse(req.body);
  const { chatId, messageId } = chatMessageParamsSchema.parse(req.params);
  assertSameUser(requireAuthId(req), body.userId);
  const data = await chatService.markRead(chatId, messageId, body.userId);
  res.status(200).json({ success: true, data });
};

export const updateLastSeen = async (req: Request, res: Response) => {
  const body = lastSeenSchema.parse(req.body);
  const { chatId } = chatParamsSchema.parse(req.params);
  assertSameUser(requireAuthId(req), body.userId);
  const data = await chatService.updateLastSeen(chatId, body.userId, body.messageId);
  res.status(200).json({ success: true, data });
};

export const listUserChats = async (req: Request, res: Response) => {
  const { userId } = userParamsSchema.parse(req.params);
  assertSameUser(requireAuthId(req), userId);
  if (!(await chatRepository.userExists(userId))) {
    throw new AppError(404, "USER_NOT_FOUND", "User does not exist");
  }
  const chats = await chatRepository.listForUser(userId);
  res.status(200).json({ success: true, data: { chats } });
};