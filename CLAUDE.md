# CLAUDE.md — Detector de Phishing Bancario Chile
### Hackathon BenditeIA FinteChile 2026 · Impact Lab

---

## Qué es este proyecto

Herramienta que analiza mensajes sospechosos (SMS, WhatsApp, URLs) y determina si
son intentos de phishing bancario en Chile. Combina señales técnicas de múltiples
fuentes con un agente Claude especializado y contexto legal chileno real.

**Audiencia objetivo:** cualquier persona en Chile, especialmente adultos mayores sin
conocimientos técnicos. El lenguaje del sistema siempre debe ser simple y directo.

---

## Stack tecnológico

| Capa | Tecnología | Deploy |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS + TypeScript | Vercel |
| Backend | Node.js + Express (puerto 3001) | Railway o Render |
| Agente IA | Claude `claude-haiku-4-5-20251001` vía Anthropic SDK | — |
| Pipeline legal | Python 3 (extracción) + Gemini (clasificación) | local/CI |

---

## Estructura del proyecto

```
tracta_impact_lab/
├── CLAUDE.md                          ← este archivo
├── .gitignore
├── .env.example
├── package.json                       ← scripts raíz (dev, build)
│
├── frontend/                          ← Next.js 14
│   ├── app/
│   │   ├── page.tsx                   ← UI principal (input texto + imagen)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── info/page.tsx              ← página educativa (qué es phishing)
│   ├── components/
│   │   └── VerdictCard.tsx            ← renderiza FRAUDE/LEGÍTIMO/SOSPECHOSO
│   └── lib/
│       └── api.ts                     ← cliente HTTP hacia /api/analyze
│
└── backend/                           ← Express
    ├── index.js                       ← entry point, monta rutas y middleware
    ├── package.json
    ├── middleware/
    │   └── rateLimit.js               ← express-rate-limit (API + webhook)
    ├── routes/
    │   ├── analyze.js                 ← POST /api/analyze
    │   └── webhook.js                 ← GET/POST /api/webhook (WhatsApp)
    ├── services/
    │   ├── claude.js                  ← agente principal + scope guard
    │   ├── legalContext.js            ← carga y filtra articulos_finales.json
    │   ├── domainCheck.js             ← whitelist bancos + blacklist CMF
    │   ├── safeBrowsing.js            ← Google Safe Browsing API v4
    │   ├── virusTotal.js              ← VirusTotal API v3 (con poll 3s)
    │   ├── phishTank.js               ← PhishTank API v2
    │   ├── ocr.js                     ← Google Cloud Vision (imágenes)
    │   └── urlExtractor.js            ← extrae URLs de texto libre
    ├── data/
    │   ├── banks-cl.json              ← 12 bancos chilenos + dominios oficiales
    │   └── scammers-cl.json           ← entidades no autorizadas CMF + patrones
    └── legal/
        ├── raw/                       ← .txt de leyes (fuente: BCN)
        │   ├── ley_21459.txt          ← Delitos Informáticos
        │   ├── ley_21521.txt          ← Ley Fintec
        │   └── ley_21663.txt          ← Ley Marco Ciberseguridad (ANCI)
        ├── output/                    ← JSON generados — DEBEN estar en git
        │   ├── ley_21459_articles.json
        │   ├── ley_21521_articles.json
        │   ├── ley_21663_articles.json
        │   └── articulos_finales.json ← consumido en runtime por legalContext.js
        └── parser/
            ├── config.py              ← paths centralizados
            ├── extract.py             ← .txt → JSON (sin API)
            ├── classify_local.py      ← clasificación por keywords (sin API)
            ├── classify.py            ← clasificación con Gemini (con API)
            ├── prompts.py             ← prompts LEX + TOPIC para Gemini
            ├── requirements.txt
            └── schemas/
                └── legal_classification.py  ← modelos Pydantic
```

---

## Flujo de análisis (happy path)

```
Usuario pega SMS/URL o sube screenshot
            ↓
    POST /api/analyze
            ↓
    [OCR si es imagen → Google Vision]
    [extractUrl → regex sobre texto]
            ↓
    Promise.allSettled — 4 checks en paralelo:
    ┌─────────────────┬──────────────────┬───────────────┬─────────────┐
    │  domainCheck    │  safeBrowsing    │  virusTotal   │  phishTank  │
    │  (whitelist +   │  (Google API v4) │  (VT API v3)  │  (API v2)   │
    │   CMF blacklist)│                  │  + poll 3s    │             │
    └─────────────────┴──────────────────┴───────────────┴─────────────┘
            ↓
    isOffTopic() → FUERA_DE_SCOPE si no hay señales de phishing (sin API call)
            ↓
    getLegalContext() → filtra articulos_finales.json → máx 6 artículos relevantes
            ↓
    Claude claude-haiku-4-5-20251001
    system: SYSTEM_PROMPT (especializado, hardened)
    user:   texto + señales técnicas + artículos legales
            ↓
    JSON: { verdict, confidence, explanation, redFlags, recommendation }
            ↓
    Frontend → VerdictCard
    WhatsApp → formatWhatsAppReply
```

---

## Agente Claude — reglas de diseño

**Modelo:** `claude-haiku-4-5-20251001` — rápido y económico para volumen.

**Scope guard (`isOffTopic`):** antes de llamar a la API, filtra inputs off-topic
con regex. Si no hay señales de phishing (URL, banco, clave, SMS...) devuelve
`FUERA_DE_SCOPE` sin consumir tokens.

**System prompt:** hardened — el agente no puede ser reprogramado por el usuario,
no conversa, no explica temas distintos a fraude bancario. Contiene:
- Estadísticas reales de fraude en Chile 2025
- Dominios oficiales de los 12 bancos chilenos
- 7 reglas de análisis (dominio falso, urgencia, URLs acortadas, CMF, etc.)

**Contexto legal:** inyectado en el *user message* (no system prompt) para que
Claude pueda citar artículos específicos en `redFlags`. De ~50k tokens (3 leyes
completas) se filtran a máximo 6 artículos (~600 tokens) por llamada.

**Output siempre JSON:**
```json
{
  "verdict": "FRAUDE | LEGÍTIMO | SOSPECHOSO | FUERA_DE_SCOPE",
  "confidence": 0-100,
  "explanation": "una oración simple para cualquier persona",
  "redFlags": ["señal concreta 1", "señal concreta 2"],
  "recommendation": "acción específica que el usuario debe tomar ahora"
}
```

---

## Pipeline legal — cómo funciona

### Estado actual (funcional sin APIs externas)
```
backend/legal/output/articulos_finales.json   ← ya existe, generado con classify_local.py
```

### Pasos para regenerar

```bash
cd backend/legal/parser

# Paso 1 — extracción (siempre disponible, sin API)
python extract.py
# genera: ley_21459_articles.json, ley_21521_articles.json, ley_21663_articles.json

# Paso 2a — clasificación local por keywords (sin API, suficiente para desarrollo)
python classify_local.py
# genera: articulos_finales.json

# Paso 2b — clasificación con Gemini (mejor precisión, requiere Google)
export GOOGLE_CLOUD_PROJECT=tu-proyecto
python classify.py
# sobreescribe: articulos_finales.json (mismo schema)
```

### Cuándo re-correr
- Al publicarse una modificación a alguna de las 3 leyes
- Al agregar una ley nueva (agregar entrada en `config.py` y las listas de `extract.py`)

### Tópicos de clasificación
`fraude_digital` · `phishing_suplantacion` · `acceso_ilicito` · `datos_personales`
· `ciberseguridad` · `reporte_incidentes` · `sancion_delito` · `derecho_victima`
· `fintech_regulacion` · `definicion_tecnica` · `otro`

`legalContext.js` filtra por tópico según señales del análisis:
- URL maliciosa → `fraude_digital`, `sancion_delito`, `derecho_victima`, `phishing_suplantacion`, `acceso_ilicito`
- Datos personales expuestos → suma `datos_personales`, `reporte_incidentes`, `ciberseguridad`

---

## WhatsApp Bot

Integrado vía Meta Cloud API. El webhook en `/api/webhook`:
- **GET** → verificación de Meta (hub.challenge)
- **POST** → mensajes entrantes
  - `type: text` → analiza texto directamente
  - `type: image` → descarga media → OCR → analiza texto extraído
  - Otros tipos → pide al usuario que reenvíe como texto

Responde con formato WhatsApp (negrita con `*`, viñetas con `•`).

**Variables necesarias para activar WhatsApp:**
```
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```

---

## Variables de entorno

```env
# Anthropic (requerida siempre)
ANTHROPIC_API_KEY=sk-ant-...

# Google (Safe Browsing + Vision/OCR)
GOOGLE_SAFE_BROWSING_KEY=AIza...
GOOGLE_VISION_KEY=AIza...

# VirusTotal
VIRUSTOTAL_API_KEY=...

# PhishTank (opcional — sin key funciona con límite anónimo)
PHISHTANK_API_KEY=

# WhatsApp Cloud API (solo para canal WhatsApp)
WHATSAPP_TOKEN=EAAx...
WHATSAPP_PHONE_NUMBER_ID=12345678
WHATSAPP_VERIFY_TOKEN=token_secreto_que_eliges

# App
PORT=3001
FRONTEND_URL=http://localhost:3000
```

El sistema funciona con solo `ANTHROPIC_API_KEY` + datos estáticos (bancos, CMF,
leyes). Cada API adicional suma precisión pero no bloquea el funcionamiento.

---

## Desarrollo local

```bash
# Backend
cd backend && npm install && npm run dev     # puerto 3001

# Frontend
cd frontend && npm install && npm run dev    # puerto 3000

# Pipeline legal (solo si se modifican leyes)
cd backend/legal/parser
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python extract.py && python classify_local.py
```

---

## Datos estáticos — cuándo actualizar manualmente

| Archivo | Cuándo actualizar |
|---|---|
| `data/banks-cl.json` | Si un banco cambia su dominio oficial |
| `data/scammers-cl.json` | Cuando CMF publica nuevas entidades no autorizadas |
| `legal/raw/*.txt` | Cuando se modifique o promulgue una ley relevante |

---

## Lo que falta / pendiente

- [ ] Conectar `GOOGLE_CLOUD_PROJECT` y correr `classify.py` para clasificación precisa con Gemini
- [ ] Configurar webhook de WhatsApp en Meta Developer Console (producción)
- [ ] Deploy backend en Railway + frontend en Vercel
- [ ] Variables de entorno en Railway/Vercel (usar `.env.example` como guía)
- [ ] Pruebas end-to-end con URLs reales de PhishTank
