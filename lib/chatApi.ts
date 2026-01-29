export type ChatSummary = {
  chat_id: string;
  created_at: string;
  title: string;
};

export type ChatMessage = {
  message_id: string;
  text: string;
  role: 'user' | 'assistant' | string;
  created_at: string;
  meta: Record<string, unknown> | null;
};

export type ChatHistory = {
  chat_id: string;
  created_at: string;
  title: string;
  messages: ChatMessage[] | null;
};

export type StreamEvent = {
  type: 'token' | 'tool_start' | 'tool_end' | 'product' | 'article' | 'done' | 'error' | 'chat_data';
  data: Record<string, unknown>;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function assertBaseUrl() {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  }
}

export async function fetchUserChats(userId: string): Promise<ChatSummary[]> {
  assertBaseUrl();
  const res = await fetch(`${BASE_URL}/api/v1/chat/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch chats: ${res.status}`);
  }

  return (await res.json()) as ChatSummary[];
}

export async function fetchChatHistory(chatId: string): Promise<ChatHistory | null> {
  assertBaseUrl();
  const res = await fetch(`${BASE_URL}/api/v1/chat/${chatId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch chat: ${res.status}`);
  }

  return (await res.json()) as ChatHistory;
}

export async function sendMessageStream(opts: {
  userId: string;
  chatId: string | null;
  message: string;
  onChatId?: (chatId: string) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}) {
  assertBaseUrl();
  const res = await fetch(`${BASE_URL}/api/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: opts.userId,
      chat_id: opts.chatId,
      message: opts.message,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;

      const jsonText = line.replace(/^data:\s*/, '');
      if (!jsonText) continue;

      const event = JSON.parse(jsonText) as StreamEvent;

      if (event.type === 'chat_data') {
        const chatId = event.data.chat_id as string;
        opts.onChatId?.(chatId);
      }

      if (event.type === 'token') {
        const token = event.data.content as string;
        opts.onToken?.(token);
      }

      if (event.type === 'done') {
        opts.onDone?.();
      }

      if (event.type === 'error') {
        const message = event.data.message as string;
        opts.onError?.(message);
      }
    }
  }
}
