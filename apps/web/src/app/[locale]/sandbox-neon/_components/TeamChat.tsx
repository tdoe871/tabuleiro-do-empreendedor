"use client";

import { useState, type FormEvent } from "react";
import { MoreHorizontal, Paperclip, Send } from "lucide-react";

export interface ChatMessage {
  id: number;
  author: string;
  initials: string;
  text: string;
  time: string;
  color: string;
  own?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    author: "Júlia Mendes",
    initials: "JM",
    text: "Pessoal, subi a nova versão do protótipo. O fluxo de onboarding ficou bem mais direto!",
    time: "10:24",
    color: "#9b8cff",
  },
  {
    id: 2,
    author: "Rafael Lima",
    initials: "RL",
    text: "Excelente! Vou preparar os testes com os 5 usuários que entrevistamos.",
    time: "10:28",
    color: "#50ddff",
  },
  {
    id: 3,
    author: "Você",
    initials: "AC",
    text: "Perfeito. Vamos usar os resultados para fechar a missão de validação hoje.",
    time: "10:31",
    color: "#b7ff5a",
    own: true,
  },
];

export function TeamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        author: "Você",
        initials: "AC",
        text: trimmed,
        time: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        color: "#b7ff5a",
        own: true,
      },
    ]);
    setDraft("");
  }

  return (
    <aside
      className="chat-panel bg-none bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
      id="comunidade"
    >
      <div className="chat-head">
        <div>
          <div className="online-badge text-emerald-600">
            <span /> 4 online
          </div>
          <h2 className="text-slate-900">Base da equipe</h2>
        </div>
        <button
          type="button"
          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={19} />
        </button>
      </div>

      <div className="messages">
        <div className="date-divider">
          <span className="bg-slate-100 border border-slate-200 text-slate-500">
            HOJE
          </span>
        </div>
        {messages.map((item) => (
          <div
            className={`message ${item.own ? "own-message" : ""}`}
            key={item.id}
          >
            <div className="avatar" style={{ background: item.color }}>
              {item.initials}
            </div>
            <div>
              <div className="message-info">
                <strong className="text-slate-900">{item.author}</strong>
                <span className="text-slate-500">{item.time}</span>
              </div>
              <p
                className={
                  item.own
                    ? "bg-indigo-50 border border-indigo-200 text-slate-900"
                    : "bg-slate-50 border border-slate-200 text-slate-600"
                }
              >
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="chat-form bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#6366F1] transition-all"
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-all"
          aria-label="Anexar arquivo"
        >
          <Paperclip size={17} />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem para a equipe..."
          aria-label="Mensagem para a equipe"
          className="text-slate-900 placeholder:text-slate-500"
        />
        <button
          className="send-button bg-none bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-lg shadow-sm active:scale-95 transition-all"
          type="submit"
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
