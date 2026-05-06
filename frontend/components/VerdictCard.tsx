"use client";

import type { AnalysisResult } from "@/lib/api";

interface VerdictCardProps {
  result: AnalysisResult;
}

const VERDICT_CONFIG = {
  FRAUDE: {
    icon: "⚠️",
    bg: "bg-red-50 border-red-200",
    title: "bg-red-100 text-red-800",
    badge: "Este mensaje es FRAUDE",
  },
  SOSPECHOSO: {
    icon: "🔶",
    bg: "bg-amber-50 border-amber-200",
    title: "bg-amber-100 text-amber-800",
    badge: "Mensaje SOSPECHOSO",
  },
  LEGÍTIMO: {
    icon: "✅",
    bg: "bg-green-50 border-green-200",
    title: "bg-green-100 text-green-800",
    badge: "Mensaje parece LEGÍTIMO",
  },
  FUERA_DE_SCOPE: {
    icon: "💬",
    bg: "bg-gray-50 border-gray-200",
    title: "bg-gray-100 text-gray-700",
    badge: "Envíame un mensaje sospechoso",
  },
} as const;

export default function VerdictCard({ result }: VerdictCardProps) {
  const cfg = VERDICT_CONFIG[result.verdict];

  return (
    <div className={`rounded-xl border p-5 ${cfg.bg}`}>
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold mb-3 ${cfg.title}`}>
        <span>{cfg.icon}</span>
        <span>{cfg.badge}</span>
        {result.verdict !== "FUERA_DE_SCOPE" && (
          <span className="ml-1 text-xs font-normal opacity-70">({result.confidence}% confianza)</span>
        )}
      </div>

      <p className="text-gray-800 text-sm mb-4">{result.explanation}</p>

      {result.verdict !== "FUERA_DE_SCOPE" && (
        <>
          {result.redFlags.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Señales de alerta</p>
              <ul className="space-y-1">
                {result.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-red-400 shrink-0">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-white/60 border border-white/80 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Qué hacer ahora</p>
            <p className="text-sm text-gray-800">{result.recommendation}</p>
          </div>

          {result.signals?.phishTank?.isPhishing && (
            <div className="mt-3 rounded-lg bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-700">
              Confirmado en base de datos global PhishTank (ID: {result.signals.phishTank.phishId})
            </div>
          )}

          {result.signals?.domain?.cmfAlert && (
            <div className="mt-3 rounded-lg bg-orange-100 border border-orange-200 px-3 py-2 text-xs text-orange-700">
              Entidad reportada por la CMF Chile como no autorizada.{" "}
              <a
                href="https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43545.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver alertas CMF
              </a>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            El phishing bancario es delito en Chile bajo la{" "}
            <strong>Ley 21.459 — Delitos Informáticos</strong>. Si fuiste víctima,
            denuncia en{" "}
            <a href="https://csirt.gob.cl" target="_blank" rel="noopener noreferrer" className="underline">
              csirt.gob.cl
            </a>{" "}
            o en la PDI Cibercrimen.
          </p>
        </>
      )}
    </div>
  );
}
