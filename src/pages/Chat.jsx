// Smart Coach chat (answers come from src/coach.js).
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { useLang } from "../i18n.js";
import { cn } from "../ui.js";
import { coachReply } from "../coach.js";

const PROMPT_SUGGESTIONS = [
  { label: "How can I improve my savings rate?", topic: "savings" },
  { label: "Explain my financial freedom date", topic: "fire" },
  { label: "What's a healthy emergency fund for me?", topic: "emergency" },
  { label: "Break down my DTI ratio", topic: "debt" },
  { label: "How healthy are my finances overall?", topic: "health" },
];

// Smart Coach: answers come from src/coach.js, built from the user's own numbers.
// No AI service or network involved, so it works anywhere and has no usage limit.
export function ChatPage({ profile, metrics, fireData, T }) {
  const { t, lang, money, fmt } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // topic: set when a suggestion is tapped, so the answer doesn't depend on keyword matching.
  const send = (textOverride, topic) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    const reply = coachReply(text, { profile, metrics, fireData, lang, money, fmt, topic });
    // A short pause so the reply doesn't appear in the same instant as the question.
    timerRef.current = window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Smart Coach")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Guidance built from the numbers in your financial profile.")}</p>
      </div>

      <div className={cn("mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border p-4", T.panel, T.cardBorder)} style={{ minHeight: 320, maxHeight: 460 }}>
        <div className="flex justify-start">
          <div style={{ maxWidth: "85%" }} className={cn("whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5 text-sm", T.border, T.text)}>
            {t("Hi, I'm your Batara Kuwera Smart Coach. Ask me about your savings, emergency fund, debt, net worth, budget or FIRE date, or pick a suggestion below.")}
          </div>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              style={{ maxWidth: "85%" }}
              className={cn(
                "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                m.role === "user" ? "bg-red-600 text-white" : cn("border", T.border, T.text)
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className={cn("flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-sm", T.border, T.mutedText)}>
              <Sparkles size={13} className="animate-pulse" /> {t("thinking…")}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPT_SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => send(t(s.label), s.topic)} disabled={loading} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", T.border, T.subtext, T.hoverBg)}>
            {t(s.label)}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Ask about your savings, debt, or FIRE date…")}
          className={cn("flex-1 rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-red-600", T.inputBg, T.inputBorder, T.text)}
        />
        <button type="submit" disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
