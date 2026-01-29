'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchChatHistory,
  fetchUserChats,
  sendMessageStream,
  type ChatMessage,
  type ChatSummary,
} from '../lib/chatApi';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const fallbackChats: ChatSummary[] = [
  {
    chat_id: 'chat-1',
    created_at: new Date().toISOString(),
    title: 'Подбор ухода для сухой кожи',
  },
  {
    chat_id: 'chat-2',
    created_at: new Date().toISOString(),
    title: 'Сыворотка от высыпаний',
  },
  {
    chat_id: 'chat-3',
    created_at: new Date().toISOString(),
    title: 'Увлажнение лица',
  },
  {
    chat_id: 'chat-4',
    created_at: new Date().toISOString(),
    title: 'Подбор аналога крема',
  },
  {
    chat_id: 'chat-5',
    created_at: new Date().toISOString(),
    title: 'Уход для сухой кожи',
  },
  {
    chat_id: 'chat-6',
    created_at: new Date().toISOString(),
    title: 'Сравнение сывороток',
  },
  {
    chat_id: 'chat-7',
    created_at: new Date().toISOString(),
    title: 'Базовый уход для лица',
  },
];

export default function Home() {
  const [userId] = useState(DEFAULT_USER_ID);
  const [chats, setChats] = useState<ChatSummary[]>(fallbackChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchUserChats(userId)
      .then((data) => {
        if (!isMounted) return;
        if (data.length > 0) {
          setChats(data);
          setActiveChatId(data[1]?.chat_id ?? data[0]?.chat_id ?? null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setChats(fallbackChats);
        setActiveChatId(fallbackChats[1]?.chat_id ?? null);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!activeChatId) return;
    let isMounted = true;

    fetchChatHistory(activeChatId)
      .then((data) => {
        if (!isMounted) return;
        setMessages(data?.messages ?? []);
      })
      .catch(() => {
        if (!isMounted) return;
        setMessages([]);
      });

    return () => {
      isMounted = false;
    };
  }, [activeChatId]);

  const sidebarChats = useMemo(() => chats.slice(0, 7), [chats]);

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return;
    setIsStreaming(true);
    setStatus(null);

    const optimistic: ChatMessage = {
      message_id: crypto.randomUUID(),
      text: message,
      role: 'user',
      created_at: new Date().toISOString(),
      meta: null,
    };

    setMessages((prev) => [...prev, optimistic]);
    setMessage('');

    let assistantBuffer = '';
    let assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      {
        message_id: assistantId,
        text: '',
        role: 'assistant',
        created_at: new Date().toISOString(),
        meta: null,
      },
    ]);

    try {
      await sendMessageStream({
        userId,
        chatId: activeChatId,
        message: optimistic.text,
        onChatId: (chatId) => setActiveChatId(chatId),
        onToken: (token) => {
          assistantBuffer += token;
          setMessages((prev) =>
            prev.map((item) =>
              item.message_id === assistantId
                ? { ...item, text: assistantBuffer }
                : item
            )
          );
        },
        onDone: () => {
          setIsStreaming(false);
        },
        onError: (errorMessage) => {
          setStatus(errorMessage);
          setIsStreaming(false);
        },
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка соединения');
      setIsStreaming(false);
    }
  };

  return (
    <main>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <LogoIcon />
            GELTEK
            <span className="brand-badge">☀️</span>
          </div>

          <button className="new-chat" type="button">
            <PlusIcon />
            <span>Новый чат</span>
          </button>

          <div className="menu">
            <div className="menu-item">
              <span className="menu-icon">
                <HeartIcon />
              </span>
              Избранное
            </div>
            <div className="menu-item">
              <span className="menu-icon">
                <UserIcon />
              </span>
              Кабинет
            </div>
            <div className="menu-item">
              <span className="menu-icon">
                <BagIcon />
              </span>
              Корзина
            </div>
          </div>

          <div>
            <div className="section-title">Ваши чаты</div>
            <div className="chat-list">
              {sidebarChats.map((chat) => (
                <div
                  key={chat.chat_id}
                  className={`chat-item${chat.chat_id === activeChatId ? ' active' : ''}`}
                  onClick={() => setActiveChatId(chat.chat_id)}
                >
                  {chat.title}
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <div>Запись на консультацию</div>
            <a className="footer-link" href="#">
              Перейти на сайт Geltek
              <ArrowIcon />
            </a>
            <div className="profile">
              <img src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=120&h=120&fit=facearea&facepad=2" alt="Иван Иванов" />
              <div className="profile-info">
                <div className="profile-name">Иван Иванов</div>
                <div className="profile-discount">
                  Моя скидка <span className="discount-pill">-10%</span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', color: '#b0b0be' }}>
                <ArrowCircleIcon />
              </div>
            </div>
          </div>
        </aside>

        <section className="main-content">
          <div className="hero">
            <div className="hero-logo">
              <LogoMark />
            </div>
            <div className="hero-title">Привет 👋 я знаю всё об уходовой косметике</div>
            <div className="hero-subtitle">
              Помогу тебе выбрать средство под твои задачи
              <br />и ответить на любые вопросы по уходу
            </div>

            <div className="chat-input">
              <PlusSoftIcon />
              <input
                placeholder="Спроси меня что угодно"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <button className="send-button" type="button" onClick={handleSend}>
                <SendIcon />
              </button>
            </div>
            {status ? <div className="notice">{status}</div> : null}
          </div>

          <div className="quick-actions">
            <div className="quick-actions-title">Что я умею?</div>
            <div className="chip-row">
              <div className="chip">
                <FlameIcon />
                Анализ кожи лица по фото
              </div>
              <div className="chip">Подобрать аналог по фото</div>
              <div className="chip">Собрать набор для ухода</div>
              <div className="chip">Подобрать средство</div>
              <div className="chip">Подобрать средство</div>
              <div className="chip">
                Собрать набор для студии <span className="pill">Бизнесу</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M26.5 7.5C23.7 4.3 19.5 2.5 15 2.5C7.5 2.5 1.5 8.5 1.5 16C1.5 23.5 7.5 29.5 15 29.5C19.4 29.5 23.3 27.6 26 24.6"
        stroke="#6B6BDD"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 10.5H14C10 10.5 7 13.5 7 17.5C7 21.5 10 24.5 14 24.5H22"
        stroke="#6B6BDD"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M48.5 15C43 9 35.5 6 28.5 6C17 6 8 15 8 26.5C8 38 17 47 28.5 47C35.5 47 41.5 44.5 46 40"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M41 20.5H28C22 20.5 17.5 25 17.5 31C17.5 37 22 41.5 28 41.5H41"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4V16" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 10H16" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 20.5C7.5 16.5 4 13.5 4 9.8C4 7 6.2 5 8.9 5C10.6 5 12.1 5.9 12.8 7.3C13.5 5.9 15 5 16.7 5C19.4 5 21.6 7 21.6 9.8C21.6 13.5 18.1 16.5 13.6 20.5L12 22"
        fill="#6B6BDD"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 12.5C14.5 12.5 16.5 10.5 16.5 8C16.5 5.5 14.5 3.5 12 3.5C9.5 3.5 7.5 5.5 7.5 8C7.5 10.5 9.5 12.5 12 12.5Z"
        fill="#6B6BDD"
      />
      <path
        d="M4 20C4.5 16.5 8 14.5 12 14.5C16 14.5 19.5 16.5 20 20"
        fill="#6B6BDD"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="8" width="14" height="12" rx="3" stroke="#6B6BDD" strokeWidth="2" />
      <path d="M9 8V7C9 5.3 10.3 4 12 4C13.7 4 15 5.3 15 7V8" stroke="#6B6BDD" strokeWidth="2" />
    </svg>
  );
}

function PlusSoftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19" stroke="#8F8FA5" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12H19" stroke="#8F8FA5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 12H18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 7L18 12L13 17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 5H15V13" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 15L15 5" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 8L14 12L10 16" stroke="#B0B0BE" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="#E0E0EC" strokeWidth="2" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 3C14 5 13 6.5 12 8C11 9.5 11 11.5 13 13C15 14.5 16 16 15.5 18C15 20.5 13 22 10.5 22C7.5 22 5 19.5 5 16C5 11 9 7 13 3Z"
        fill="#FF6B6B"
      />
    </svg>
  );
}
