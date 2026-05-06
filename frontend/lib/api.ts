const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export interface AnalysisResult {
  verdict: "FRAUDE" | "LEGÍTIMO" | "SOSPECHOSO" | "FUERA_DE_SCOPE";
  confidence: number;
  explanation: string;
  redFlags: string[];
  recommendation: string;
  url: string | null;
  signals: {
    domain: { isSafe: boolean; bankName: string | null; cmfAlert?: boolean; reason: string } | null;
    safeBrowsing: { isMalicious: boolean; threats: string[] } | null;
    virusTotal: { maliciousCount: number; suspiciousCount: number; permalink: string } | null;
    phishTank: { isPhishing: boolean; inDatabase: boolean; phishId: string | null } | null;
  };
}

export async function analyzeMessage(payload: {
  text?: string;
  url?: string;
  imageBase64?: string;
}): Promise<AnalysisResult> {
  const res = await fetch(`${BACKEND_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Error al analizar el mensaje");
  }

  return res.json();
}
