import { db } from "../config/database";

export interface ChatRow {
  id: string;
  user_low_id: string;
  user_high_id: string;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date | null;
}

export class ChatRepository {
  async userExists(userId: string): Promise<boolean> {
    const result = await db.query("SELECT 1 FROM users WHERE id = $1", [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async createOrGet(userAId: string, userBId: string): Promise<{ chat: ChatRow; created: boolean }> {
    const [low, high] = [userAId, userBId].sort((a, b) => a.localeCompare(b));
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const insert = await client.query<ChatRow>(
        `INSERT INTO chats (user_low_id, user_high_id)
         VALUES ($1, $2)
         ON CONFLICT (user_low_id, user_high_id) DO NOTHING
         RETURNING id, user_low_id, user_high_id, created_at, updated_at, last_message_at`,
        [low, high]
      );
      let chat = insert.rows[0];
      const created = Boolean(chat);
      if (!chat) {
        const existing = await client.query<ChatRow>(
          `SELECT id, user_low_id, user_high_id, created_at, updated_at, last_message_at
           FROM chats WHERE user_low_id = $1 AND user_high_id = $2`,
          [low, high]
        );
        chat = existing.rows[0];
      }
      if (!chat) throw new Error("Chat could not be created or retrieved");
      await client.query(
        `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)
         ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chat.id, low, high]
      );
      await client.query("COMMIT");
      return { chat, created };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      "SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2",
      [chatId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateLastMessageAt(chatId: string, timestamp: Date): Promise<void> {
    await db.query(
      "UPDATE chats SET last_message_at = GREATEST(COALESCE(last_message_at, $2), $2), updated_at = NOW() WHERE id = $1",
      [chatId, timestamp]
    );
  }

  async listForUser(userId: string): Promise<Array<{
    chatId: string; memberIds: string[]; createdAt: Date; updatedAt: Date; lastMessageAt: Date | null;
  }>> {
    const result = await db.query(
      `SELECT c.id AS "chatId", c.created_at AS "createdAt", c.updated_at AS "updatedAt",
              c.last_message_at AS "lastMessageAt",
              ARRAY(SELECT cm2.user_id FROM chat_members cm2
                    WHERE cm2.chat_id = c.id ORDER BY cm2.user_id) AS "memberIds"
       FROM chats c
       INNER JOIN chat_members mine ON mine.chat_id = c.id
       WHERE mine.user_id = $1
       ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`,
      [userId]
    );
    return result.rows;
  }
}
export const chatRepository = new ChatRepository();