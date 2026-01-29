'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement | null>(null);

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
          {messages.length > 0 ? (
            <div className="chat-thread">
              {messages.map((item) => (
                <div key={item.message_id} className={`chat-bubble ${item.role}`}>
                  <div className="chat-bubble-content">
                    {item.text ? (
                      item.text
                    ) : item.role === 'assistant' && isStreaming ? (
                      <span className="typing-indicator" aria-label="Ожидание ответа">
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className={`hero ${messages.length === 0 ? 'hero-centered' : ''}`}>
            {messages.length === 0 ? (
              <>
                <LogoMark />
                <div className="hero-title">Привет 👋 я знаю всё об уходовой косметике</div>
                <div className="hero-subtitle">
                  Помогу тебе выбрать средство под твои задачи
                  <br />и ответить на любые вопросы по уходу
                </div>
              </>
            ) : null}

            <div className="chat-input" onClick={() => inputRef.current?.focus()}>
              <PlusSoftIcon />
              <input
                placeholder="Спроси меня что угодно"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                ref={inputRef}
              />
              <button className="send-button" type="button" onClick={handleSend}>
                <SendIcon />
              </button>
            </div>
            {status ? <div className="notice">{status}</div> : null}
          </div>

          {messages.length === 0 ? (
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
          ) : null}
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.4"
              d="M4.1449 3.35515C7.12587 1.52662 9.8001 2.25537 11.4156 3.46861C11.6814 3.6682 11.8638 3.8048 11.9996 3.89704C12.1354 3.8048 12.3178 3.6682 12.5836 3.46861C14.1991 2.25537 16.8734 1.52662 19.8543 3.35515C21.9156 4.61952 23.0754 7.2606 22.6684 10.2951C22.2595 13.3443 20.2859 16.7929 16.1063 19.8865C14.6549 20.9614 13.5897 21.7503 11.9996 21.7503C10.4095 21.7503 9.34433 20.9614 7.89294 19.8865C3.71334 16.7929 1.73976 13.3443 1.33081 10.2951C0.923825 7.2606 2.08365 4.61952 4.1449 3.35515Z"
              fill="#5E60D0"/>
        <path
            d="M4.1449 3.35515C7.12587 1.52662 9.8001 2.25537 11.4156 3.46861C11.6814 3.6682 11.8638 3.8048 11.9996 3.89704V21.7503C10.4095 21.7503 9.34433 20.9614 7.89294 19.8865C3.71334 16.7929 1.73976 13.3443 1.33081 10.2951C0.923825 7.2606 2.08365 4.61952 4.1449 3.35515Z"
            fill="#5E60D0"/>
      </svg>

  );
}

function UserIcon() {
  return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M17.8063 14.8372C17.9226 14.9064 18.0663 14.9875 18.229 15.0793C18.9418 15.4814 20.0193 16.0893 20.7575 16.8118C21.2191 17.2637 21.6578 17.8592 21.7375 18.5888C21.8223 19.3646 21.4839 20.0927 20.8048 20.7396C19.6334 21.8556 18.2276 22.75 16.4093 22.75H7.59104C5.77274 22.75 4.36695 21.8556 3.1955 20.7396C2.51649 20.0927 2.17802 19.3646 2.26283 18.5888C2.34257 17.8592 2.78123 17.2637 3.2429 16.8118C3.98106 16.0893 5.05857 15.4814 5.77139 15.0793C5.93405 14.9876 6.07773 14.9064 6.19404 14.8372C9.74809 12.7209 14.2523 12.7209 17.8063 14.8372Z"
            fill="#5E60D0"/>
        <path opacity="0.4"
              d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.39949 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.39949 6.75 6.5Z"
              fill="#5E60D0"/>
      </svg>

  );
}

function BagIcon() {
  return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.4"
              d="M14.5824 7C15.7679 6.99998 16.728 6.99997 17.4956 7.09645C18.2954 7.19698 18.9761 7.41108 19.5559 7.90272C20.1347 8.39351 20.4607 9.03179 20.6979 9.80779C20.9261 10.5545 21.0946 11.5103 21.3032 12.6935L21.6873 14.8719C21.9772 16.5159 22.2087 17.8288 22.2449 18.8675C22.2823 19.9384 22.1198 20.8568 21.4927 21.6154C20.864 22.3759 19.9951 22.7015 18.9427 22.8533C17.9247 23 16.6061 23 14.9589 23H9.04111C7.39387 23 6.07529 23 5.0573 22.8533C4.00487 22.7015 3.13596 22.3759 2.50727 21.6154C1.88015 20.8568 1.7177 19.9384 1.75503 18.8675C1.79124 17.8288 2.02276 16.5158 2.31266 14.8719L2.69674 12.6935C2.90536 11.5103 3.07386 10.5545 3.3021 9.80779C3.53928 9.03179 3.86527 8.39351 4.44408 7.90272C5.02391 7.41108 5.70461 7.19698 6.50436 7.09645C7.27197 6.99997 8.23203 6.99998 9.41756 7H14.5824Z"
              fill="#5E60D0"/>
        <path
            d="M11.9999 12.25C13.1316 12.25 13.9287 11.4784 14.0041 10.6584C14.0547 10.1084 14.5416 9.7036 15.0916 9.75421C15.6415 9.80481 16.0463 10.2917 15.9957 10.8416C15.8111 12.8478 13.9996 14.25 11.9999 14.25C10.0003 14.25 8.18874 12.8478 8.00414 10.8416C7.95354 10.2917 8.35835 9.80481 8.90831 9.75421C9.45827 9.7036 9.94512 10.1084 9.99573 10.6584C10.0712 11.4784 10.8683 12.25 11.9999 12.25Z"
            fill="#5E60D0"/>
        <path
            d="M8.81619 5.75237C8.95418 4.12598 10.3385 2.87499 12.0002 2.87499C13.6619 2.87499 15.0462 4.12598 15.1842 5.75237L15.2901 7.00084C16.0262 7.00362 16.6632 7.01544 17.2113 7.06574L17.0866 5.59666C16.8662 2.99848 14.6548 1 12.0002 1C9.34559 1 7.13416 2.99848 6.91371 5.59666L6.78906 7.06574C7.33712 7.01544 7.97416 7.00362 8.71026 7.00084L8.81619 5.75237Z"
            fill="#5E60D0"/>
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 7.00006L6 18.0001" stroke="#5E60D0" stroke-width="1.5" stroke-linecap="round"/>
        <path
            d="M11 5.99994H17C17.4714 5.99994 17.7071 5.99994 17.8536 6.14639C18 6.29283 18 6.52853 18 6.99994V12.9999"
            stroke="#5E60D0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>

  );
}

function ArrowCircleIcon() {
  return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd"
              d="M12.85 4C8.03858 4 4.25 7.64154 4.25 12C4.25 16.3585 8.03858 20 12.85 20C13.2801 20 13.7022 19.9707 14.1143 19.9142C14.6615 19.8393 15.1658 20.2221 15.2407 20.7693C15.3157 21.3164 14.9329 21.8208 14.3857 21.8957C13.8838 21.9645 13.371 22 12.85 22C7.05756 22 2.25 17.5827 2.25 12C2.25 6.41734 7.05756 2 12.85 2C13.371 2 13.8838 2.03552 14.3857 2.10427C14.9329 2.17922 15.3157 2.68355 15.2407 3.23073C15.1658 3.7779 14.6615 4.16072 14.1143 4.08576C13.7022 4.02931 13.2801 4 12.85 4Z"
              fill="#737373"/>
        <path opacity="0.4"
              d="M10.75 13.0059C10.1977 13.0059 9.75 12.5581 9.75 12.0059C9.75 11.4536 10.1977 11.0059 10.75 11.0059H17.25V10.4116C17.2499 10.236 17.2497 10.0203 17.2718 9.84387L17.2722 9.84053C17.288 9.71408 17.3598 9.13804 17.9254 8.86368C18.4923 8.58872 18.9924 8.89065 19.1006 8.95597L19.5691 9.29511C19.9449 9.58975 20.4594 9.99545 20.8504 10.3759C21.0455 10.5657 21.2467 10.783 21.4056 11.0139C21.5468 11.2191 21.75 11.5693 21.75 12C21.75 12.4307 21.5468 12.7809 21.4056 12.9861C21.2467 13.217 21.0455 13.4343 20.8504 13.6241C20.4594 14.0046 19.9449 14.4102 19.5691 14.7049L19.1006 15.044C18.9924 15.1093 18.4922 15.4113 17.9254 15.1363C17.3598 14.862 17.288 14.2859 17.2722 14.1595L17.2718 14.1561C17.2497 13.9797 17.2499 13.764 17.25 13.5884V13.0059H10.75Z"
              fill="#737373"/>
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
