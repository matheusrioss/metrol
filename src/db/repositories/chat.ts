import { getDatabase } from '../index';
import { newId } from '@/lib/id';
import type { ChatMessage } from '@/lib/types';

export async function appendMessage(
  role: 'user' | 'watson',
  content: string,
  contextRef?: string | null,
): Promise<ChatMessage> {
  const db = await getDatabase();
  const message: ChatMessage = {
    id: newId(),
    role,
    content,
    context_ref: contextRef ?? null,
    created_at: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO chat_messages (id, role, content, context_ref, created_at) VALUES (?, ?, ?, ?, ?)',
    [message.id, message.role, message.content, message.context_ref, message.created_at],
  );
  return message;
}

export async function recentMessages(limit = 40): Promise<ChatMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ChatMessage>(
    'SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.reverse();
}

export async function clearChat(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM chat_messages');
}
