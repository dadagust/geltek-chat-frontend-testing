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
              <LogoMark />
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
      <svg width="32" height="34" viewBox="0 0 32 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M27.6046 19.1817V20.9983C27.6046 22.7765 26.6582 24.434 25.1345 25.3225L18.0996 29.4275C17.3496 29.8651 16.4955 30.0966 15.6294 30.0966C14.7633 30.0966 13.9092 29.8651 13.1593 29.4275L6.12439 25.3225C4.60064 24.434 3.65426 22.7765 3.65426 20.9983V12.7896C3.65426 11.0114 4.60064 9.35389 6.12439 8.46536L17.5873 1.7771C18.2721 1.3778 18.105 0.331283 17.329 0.173325C16.7679 0.0570451 16.1982 0 15.6283 0C14.1447 0 12.6611 0.388328 11.3317 1.16389L4.29675 5.26877C1.63777 6.81986 5.34058e-05 9.68629 5.34058e-05 12.7885V20.9972C5.34058e-05 24.0995 1.63777 26.967 4.29675 28.518L11.3317 32.6229C12.6611 33.3985 14.1447 33.7868 15.6283 33.7868C17.1119 33.7868 18.5955 33.3985 19.925 32.6229L26.9599 28.518C29.6189 26.967 31.2566 24.0995 31.2566 20.9972V17.0502L27.6046 19.1817Z"
            fill="#5E60D0"/>
        <path
            d="M26.1022 10.5227L16.1392 16.3344C15.6074 16.6449 15.2797 17.2186 15.2797 17.8384V19.5936C15.2797 20.2616 15.9959 20.6796 16.5689 20.3461L30.9014 11.9838C30.0646 10.2846 27.906 9.47074 26.1022 10.5227Z"
            fill="#5E60D0"/>
      </svg>

  );
}

function LogoMark() {
  return (
      <svg width="325" height="283" viewBox="0 0 325 283" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.6">
          <g filter="url(#filter0_f_0_377)">
            <circle cx="202" cy="160" r="49.5" fill="#8E5ED0"/>
          </g>
          <g filter="url(#filter1_f_0_377)">
            <circle cx="137.5" cy="137.5" r="64" fill="#5E60D0"/>
          </g>
          <g filter="url(#filter2_f_0_377)">
            <circle cx="185.5" cy="109.5" r="30" fill="#FF009D"/>
          </g>
        </g>
        <path
            d="M187.132 135.547V139.34C187.132 143.052 185.156 146.513 181.975 148.368L167.288 156.938C165.722 157.852 163.939 158.335 162.131 158.335C160.322 158.335 158.539 157.852 156.974 156.938L142.286 148.368C139.105 146.513 137.129 143.052 137.129 139.34V122.202C137.129 118.489 139.105 115.029 142.286 113.174L166.218 99.2102C167.648 98.3765 167.299 96.1916 165.679 95.8619C164.507 95.6191 163.318 95.5 162.128 95.5C159.031 95.5 155.934 96.3107 153.158 97.9299L138.471 106.5C132.919 109.738 129.5 115.723 129.5 122.199V139.337C129.5 145.814 132.919 151.801 138.471 155.039L153.158 163.609C155.934 165.228 159.031 166.039 162.128 166.039C165.226 166.039 168.323 165.228 171.099 163.609L185.786 155.039C191.337 151.801 194.757 145.814 194.757 139.337V131.097L187.132 135.547Z"
            fill="white"/>
        <path
            d="M183.995 117.469L163.195 129.603C162.085 130.251 161.4 131.448 161.4 132.742V136.407C161.4 137.802 162.896 138.674 164.092 137.978L194.015 120.519C192.268 116.972 187.761 115.273 183.995 117.469Z"
            fill="white"/>
        <defs>
          <filter id="filter0_f_0_377" x="79" y="37" width="246" height="246" filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="36.75" result="effect1_foregroundBlur_0_377"/>
          </filter>
          <filter id="filter1_f_0_377" x="0" y="0" width="275" height="275" filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="36.75" result="effect1_foregroundBlur_0_377"/>
          </filter>
          <filter id="filter2_f_0_377" x="82" y="6" width="207" height="207" filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="36.75" result="effect1_foregroundBlur_0_377"/>
          </filter>
        </defs>
      </svg>

  );
}

function PlusIcon() {
  return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 4V16" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 10H16" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round"/>
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
        <rect x="5" y="8" width="14" height="12" rx="3" stroke="#6B6BDD" strokeWidth="2"/>
        <path d="M9 8V7C9 5.3 10.3 4 12 4C13.7 4 15 5.3 15 7V8" stroke="#6B6BDD" strokeWidth="2"/>
      </svg>
  );
}

function PlusSoftIcon() {
  return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19" stroke="#8F8FA5" strokeWidth="2" strokeLinecap="round"/>
        <path d="M5 12H19" stroke="#8F8FA5" strokeWidth="2" strokeLinecap="round"/>
      </svg>
  );
}

function SendIcon() {
  return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 12H18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
        <path d="M13 7L18 12L13 17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
      </svg>
  );
}

function ArrowIcon() {
  return (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 5H15V13" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round"/>
        <path d="M5 15L15 5" stroke="#6B6BDD" strokeWidth="2" strokeLinecap="round"/>
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
