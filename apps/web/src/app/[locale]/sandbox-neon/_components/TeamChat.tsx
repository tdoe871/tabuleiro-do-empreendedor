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
      className="chat-panel bg-none bg-[#151B2B]/90 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:bg-[#1C2438] hover:border-white/10"
      id="comunidade"
    >
      <div className="chat-head">
        <div>
          <div className="online-badge text-[#65dcd5]">
            <span /> 4 online
          </div>
          <h2 className="text-white">Base da equipe</h2>
        </div>
        <button
          type="button"
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={19} />
        </button>
      </div>

      <div className="messages">
        <div className="date-divider">
          <span className="bg-[#0B0F19]/80 border border-white/5 text-slate-500">
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
                <strong className="text-white">{item.author}</strong>
                <span className="text-slate-500">{item.time}</span>
              </div>
              <p
                className={
                  item.own
                    ? "bg-[#4F46E5]/20 border border-[#6366F1]/35 text-white"
                    : "bg-[#0B0F19]/80 border border-white/5 text-slate-200"
                }
              >
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="chat-form bg-[#0B0F19] border border-white/10 rounded-xl focus-within:border-[#6366F1]/60 transition-all"
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
          aria-label="Anexar arquivo"
        >
          <Paperclip size={17} />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem para a equipe..."
          aria-label="Mensagem para a equipe"
          className="text-white placeholder:text-slate-500"
        />
        <button
          className="send-button bg-none bg-[#4F46E5] hover:bg-[#6366F1] text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          type="submit"
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
