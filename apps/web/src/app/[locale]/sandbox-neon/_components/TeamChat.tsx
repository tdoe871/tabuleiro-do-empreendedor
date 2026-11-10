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
      className="chat-panel bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10"
      id="comunidade"
    >
      <div className="chat-head border-b border-white/5 text-white">
        <div>
          <div className="online-badge text-slate-400">
            <span /> 4 online
          </div>
          <h2>Base da equipe</h2>
        </div>
        <button type="button" aria-label="Mais opções">
          <MoreHorizontal size={19} />
        </button>
      </div>

      <div className="messages">
        <div className="date-divider text-slate-500">
          <span>HOJE</span>
        </div>
        {messages.map((item) => (
          <div
            className={`message text-slate-400 ${item.own ? "own-message text-slate-200" : ""}`}
            key={item.id}
          >
            <div
              className="avatar text-white"
              style={{ background: item.color }}
            >
              {item.initials}
            </div>
            <div>
              <div className="message-info text-white">
                <strong>{item.author}</strong>
                <span>{item.time}</span>
              </div>
              <p>{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="chat-form bg-white/5 border border-white/10 rounded-lg"
        onSubmit={handleSubmit}
      >
        <button type="button" aria-label="Anexar arquivo">
          <Paperclip size={17} />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem para a equipe..."
          aria-label="Mensagem para a equipe"
        />
        <button
          className="send-button bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          type="submit"
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
