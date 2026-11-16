import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { chatCollection } from "../config/firebase";
import { chatRepository } from "../repositories/chat.repository";
import { AppError } from "../utils/app-error";

export class ChatService {
  async createOrGet(userAId: string, userBId: string) {
    const [aExists, bExists] = await Promise.all([
      chatRepository.userExists(userAId), chatRepository.userExists(userBId)
    ]);
    if (!aExists || !bExists) throw new AppError(404, "USER_NOT_FOUND", "One or both users do not exist");
    const result = await chatRepository.createOrGet(userAId, userBId);
    return { chatId: result.chat.id, created: result.created };
  }

  async sendMessage(chatId: string, senderId: string, text: string) {
    await this.assertMember(chatId, senderId);
    const createdAt = Timestamp.now();
    const ref = await chatCollection(chatId).collection("messages").add({
      senderId, text, createdAt, editedAt: null, deletedAt: null
    });
    try {
      await chatRepository.updateLastMessageAt(chatId, createdAt.toDate());
    } catch (error) {
      // Firestore is the source of truth for messages. Metadata can be reconciled later.
      console.error("Message saved but chat metadata update failed", { chatId, messageId: ref.id, error });
    }
    return { messageId: ref.id, senderId, text, createdAt: createdAt.toDate().toISOString() };
  }

  async getMessages(chatId: string, userId: string, limit: number, before?: string) {
    await this.assertMember(chatId, userId);
    let query = chatCollection(chatId).collection("messages")
      .orderBy("createdAt", "desc").orderBy("__name__", "desc").limit(limit);
    if (before) {
      const beforeDate = Timestamp.fromDate(new Date(before));
      query = query.where("createdAt", "<", beforeDate) as typeof query;
    }
    const snapshot = await query.get();
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        messageId: doc.id,
        senderId: data.senderId as string,
        text: data.deletedAt ? null : data.text as string,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        editedAt: data.editedAt ? (data.editedAt as Timestamp).toDate().toISOString() : null,
        deleted: Boolean(data.deletedAt)
      };
    }).reverse();
    return { messages, hasMore: snapshot.size === limit };
  }

  async markRead(chatId: string, messageId: string, userId: string) {
    await this.assertMember(chatId, userId);
    const messageRef = chatCollection(chatId).collection("messages").doc(messageId);
    const message = await messageRef.get();
    if (!message.exists) throw new AppError(404, "MESSAGE_NOT_FOUND", "Message does not exist");
    const receiptRef = messageRef.collection("readReceipts").doc(userId);
    await receiptRef.create({ userId, readAt: FieldValue.serverTimestamp() }).catch(async (error: unknown) => {
      const code = (error as { code?: number })?.code;
      // Firestore ALREADY_EXISTS is code 6. Keep the original first-read timestamp.
      if (code !== 6) throw error;
    });
    return { messageId, userId, read: true };
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string) {
    await this.assertMember(chatId, userId);
    const messages = chatCollection(chatId).collection("messages");
    const targetRef = messages.doc(messageId);
    const target = await targetRef.get();
    if (!target.exists) throw new AppError(404, "MESSAGE_NOT_FOUND", "Message does not exist");
    const targetTime = target.get("createdAt") as Timestamp;
    const pointerRef = chatCollection(chatId).collection("lastSeen").doc(userId);
    await chatCollection(chatId).firestore.runTransaction(async transaction => {
      const current = await transaction.get(pointerRef);
      const currentTime = current.exists ? current.get("createdAt") as Timestamp : null;
      if (!currentTime || targetTime.toMillis() >= currentTime.toMillis()) {
        transaction.set(pointerRef, {
          userId, messageId, createdAt: targetTime, updatedAt: FieldValue.serverTimestamp()
        });
      }
    });
    return { userId, messageId, updated: true };
  }

  private async assertMember(chatId: string, userId: string): Promise<void> {
    const member = await chatRepository.isMember(chatId, userId);
    if (!member) throw new AppError(404, "CHAT_NOT_FOUND", "Chat does not exist or user is not a member");
  }
}
export const chatService = new ChatService();