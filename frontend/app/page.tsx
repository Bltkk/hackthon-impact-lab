"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { analyzeMessage, type AnalysisResult, type HistoryTurn } from "@/lib/api";
import VerdictCard from "@/components/VerdictCard";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  result?: AnalysisResult;
  isImage?: boolean;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  text: "",
  result: {
    verdict: "FUERA_DE_SCOPE",
    confidence: 100,
    explanation: "¡Hola! Soy Ángel 👼, tu asistente contra el fraude bancario en Chile.",
    redFlags: [],
    recommendation: "Pégame el SMS, WhatsApp o link sospechoso que recibiste y te digo al tiro si es fraude. También puedes subir una captura de pantalla. 👀",
    url: null,
    signals: { domain: null, safeBrowsing: null, virusTotal: null, phishTank: null },
  },
};

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function addUserMessage(text: string, isImage = false) {
    setMessages((prev) => [...prev, { role: "user", text, isImage }]);
  }

  function addAssistantMessage(result: AnalysisResult, userText: string) {
    const assistantSummary = JSON.stringify({
      verdict: result.verdict,
      confidence: result.confidence,
      explanation: result.explanation,
      redFlags: result.redFlags,
      recommendation: result.recommendation,
    });

    setHistory((prev) => {
      const turns = [...prev, { user: userText, assistant: assistantSummary }];
      return turns.slice(-6); // keep last 6 turns
    });

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: result.explanation, result },
    ]);
  }

  async function handleAnalyze() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    addUserMessage(text);
    setLoading(true);
    try {
      const data = await analyzeMessage({ text, history });
      addAssistantMessage(data, text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    const label = `[imagen: ${file.name}]`;
    addUserMessage(label, true);
    setLoading(true);
    try {
      const base64 = await toBase64(file);
      const data = await analyzeMessage({ imageBase64: base64, history });
      addAssistantMessage(data, label);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  }

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg">👼</div>
        <div>
          <p className="font-semibold text-sm text-gray-900">Ángel — Detector de Phishing</p>
          <p className="text-xs text-gray-400">Fraude bancario · Chile</p>
        </div>
        <Link href="/info" className="ml-auto text-xs text-blue-600 underline hover:text-blue-800">
          ¿Qué es el phishing?
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm shrink-0 mt-1">
                👼
              </div>
            )}
            <div className={`max-w-sm w-full ${msg.role === "user" ? "max-w-xs" : ""}`}>
              {msg.role === "user" ? (
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm break-words">
                  {msg.isImage ? (
                    <span className="flex items-center gap-2">📷 <span className="opacity-80">{msg.text}</span></span>
                  ) : (
                    msg.text
                  )}
                </div>
              ) : (
                msg.result && <VerdictCard result={msg.result} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm shrink-0">👼</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-sm rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            title="Subir captura de pantalla"
            className="rounded-full p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors shrink-0"
          >
            📷
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

          <textarea
            ref={textareaRef}
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
            rows={1}
            placeholder="Pega aquí el SMS, link o pregunta…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            onClick={handleAnalyze}
            disabled={loading || !input.trim()}
            className="rounded-full bg-blue-600 text-white p-2.5 hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 mt-2">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </main>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
