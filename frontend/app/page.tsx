"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { analyzeMessage, type AnalysisResult } from "@/lib/api";
import VerdictCard from "@/components/VerdictCard";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAnalyze() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeMessage({ text: input });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64 = await toBase64(file);
      const data = await analyzeMessage({ imageBase64: base64 });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Detector de Phishing Bancario</h1>
          <p className="text-sm text-gray-500 mt-1">
            ¿Recibiste un mensaje sospechoso de tu banco? Pégalo aquí o sube una captura.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <textarea
            className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={5}
            placeholder="Pega aquí el SMS o mensaje de WhatsApp sospechoso…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-medium py-2.5 hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {loading ? "Analizando…" : "Analizar mensaje"}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="rounded-lg border border-gray-200 text-sm font-medium px-4 py-2.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              📷 Subir pantallazo
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}

        {result && <VerdictCard result={result} />}

        <footer className="text-center text-xs text-gray-400 space-y-1">
          <p>ImpactLab · Este análisis es orientativo y no reemplaza al soporte oficial de tu banco.</p>
          <p>
            <Link href="/info" className="underline hover:text-gray-600">
              ¿Qué es el phishing? Aprende a reconocerlo →
            </Link>
          </p>
        </footer>
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
