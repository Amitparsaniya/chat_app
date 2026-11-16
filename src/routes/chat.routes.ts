import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { authenticate } from "../middleware/auth";
import {
  createChat, getMessages, listUserChats, markRead, sendMessage, updateLastSeen
} from "../controllers/chat.controller";

export const chatRouter = Router();
chatRouter.use(authenticate);
chatRouter.post("/chat/create", asyncHandler(createChat));
chatRouter.post("/chat/:chatId/message/send", asyncHandler(sendMessage));
chatRouter.get("/chat/:chatId/messages", asyncHandler(getMessages));
chatRouter.post("/chat/:chatId/message/:messageId/read", asyncHandler(markRead));
chatRouter.post("/chat/:chatId/lastseen", asyncHandler(updateLastSeen));
chatRouter.get("/user/:userId/chats", asyncHandler(listUserChats));