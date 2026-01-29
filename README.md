# Интеграция Next.js с Chat API (Geltek backend)

Ниже — практическая памятка по работе с API из Next.js: как получать список чатов, создавать чаты, получать историю и отправлять сообщения с потоковым ответом.

## База API

Все маршруты находятся под префиксом `/api/v1`. Роутер чатов — `/api/v1/chat`.【F:src/api/__init__.py†L1-L5】【F:src/api/v1/__init__.py†L1-L7】【F:src/api/v1/chat.py†L12-L13】

> В примерах ниже замените `BASE_URL` на URL вашего backend (например, `http://localhost:8000`).

---

## 1) Получить все чаты пользователя

**Эндпоинт**

```
GET /api/v1/chat/{user_id}
```

**Ответ** — массив объектов чатов (`chat_id`, `created_at`, `title`).【F:src/api/v1/chat.py†L53-L61】【F:src/core/schemas.py†L49-L63】

**Пример (Next.js)**

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchUserChats(userId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/chat/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch chats: ${res.status}`);
  }

  return (await res.json()) as Array<{
    chat_id: string;
    created_at: string;
    title: string;
  }>;
}
```

---

## 2) Создать новый чат

Отдельного «create chat» эндпоинта **нет** — новый чат создаётся при первом сообщении через **stream**-эндпоинт.

**Эндпоинт**

```
POST /api/v1/chat/stream
```

**Тело запроса** — `chat_id` должен быть `null` при первом сообщении.【F:src/api/v1/chat.py†L16-L51】【F:src/core/schemas.py†L10-L14】

```json
{
  "user_id": "UUID",
  "chat_id": null,
  "message": "Привет"
}
```

**Как понять, что чат создан**

Сервер стримит события; **один раз** придёт событие `chat_data` с `chat_id`. Его нужно сохранить и использовать для следующих сообщений.【F:src/api/v1/chat.py†L16-L51】【F:src/core/schemas.py†L16-L47】

---

## 3) Получить историю чата

**Эндпоинт**

```
GET /api/v1/chat/{chat_id}
```

**Ответ** — объект чата с массивом сообщений (`messages`).【F:src/api/v1/chat.py†L63-L72】【F:src/core/schemas.py†L66-L81】

**Пример (Next.js)**

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchChatHistory(chatId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/chat/${chatId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch chat: ${res.status}`);
  }

  return (await res.json()) as {
    chat_id: string;
    created_at: string;
    title: string;
    messages: Array<{
      message_id: string;
      text: string;
      role: 'user' | 'assistant' | string;
      created_at: string;
      meta: Record<string, unknown> | null;
    }> | null;
  };
}
```

---

## 4) Отправить сообщение и получить стрим-ответ

Отправка сообщения и получение ответа делается **через поток** на том же эндпоинте:

```
POST /api/v1/chat/stream
```

**Сценарии**

- **Новый чат**: `chat_id = null`.
- **Продолжение чата**: `chat_id = сохранённый ранее`.

Сервер отдает SSE/стрим из JSON-событий, которые имеют формат:

```json
{
  "type": "token | done | error | chat_data | ...",
  "data": { ... }
}
```

События `token` — это куски ответа, их нужно конкатенировать. Событие `done` означает завершение ответа. `chat_data` приходит при создании нового чата и содержит новый `chat_id`.【F:src/api/v1/chat.py†L16-L51】【F:src/core/schemas.py†L16-L47】

### Пример (Next.js, streaming fetch + reader)

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type StreamEvent = {
  type: 'token' | 'tool_start' | 'tool_end' | 'product' | 'article' | 'done' | 'error' | 'chat_data';
  data: Record<string, unknown>;
};

export async function sendMessageStream(opts: {
  userId: string;
  chatId: string | null;
  message: string;
  onChatId?: (chatId: string) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}) {
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

    // SSE формат: строки вида "data: {json}\n\n"
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
```

---

## Короткий чек-лист интеграции

1. **Для списка чатов**: `GET /api/v1/chat/{user_id}`.
2. **Для истории**: `GET /api/v1/chat/{chat_id}`.
3. **Для новых чатов**: `POST /api/v1/chat/stream` с `chat_id = null`, дождитесь `chat_data`.
4. **Для отправки сообщений**: `POST /api/v1/chat/stream` с существующим `chat_id`, собирайте `token` до `done`.

---

## Дополнительно (заметки по API)

- Backend использует `text/event-stream` (SSE) и отдаёт события в формате `data: <json>`.【F:src/api/v1/chat.py†L16-L51】
- Базовые модели данных (`ChatSchema`, `MessageSchema`, `ChatWMessagesSchema`) описаны в схемах backend и приведены в ответах выше.【F:src/core/schemas.py†L49-L81】