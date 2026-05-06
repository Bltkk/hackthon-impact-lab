"""
Clasificador de artículos legales usando Claude (Anthropic).
Alternativa a classify.py (Gemini) — misma salida, misma estructura.

Requiere:
    pip install anthropic
    ANTHROPIC_API_KEY=sk-ant-...

Uso:
    python classify_claude.py
"""

import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from anthropic import Anthropic
from config import LAW_21459_JSON, LAW_21521_JSON, LAW_21663_JSON, ARTICULOS_FINALES_JSON
from prompts import PROMPT_CLASSIFY_LEX, PROMPT_CLASSIFY_TOPIC

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

FUENTE_ALIAS = {
    "ley_21459.txt": "LEY_21459",
    "ley_21521.txt": "LEY_21521",
    "ley_21663.txt": "LEY_21663",
}

LEX_VALUES = {
    "sancion_penal", "sancion_admin", "obligacion", "prohibicion",
    "definicion", "derecho_usuario", "procedimiento", "omitir"
}

TOPIC_VALUES = {
    "fraude_digital", "phishing_suplantacion", "acceso_ilicito",
    "datos_personales", "ciberseguridad", "reporte_incidentes",
    "sancion_delito", "derecho_victima", "fintech_regulacion",
    "definicion_tecnica", "otro"
}


def classify_article(fuente: str, numero: str, texto: str) -> dict:
    snippet = texto[:800].replace("\n", " ")

    # --- LEX pass ---
    lex_prompt = f"{PROMPT_CLASSIFY_LEX}\n\nArtículo {numero} ({fuente}):\n{snippet}"
    lex_response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=32,
        messages=[{"role": "user", "content": lex_prompt}],
    )
    lex_raw = lex_response.content[0].text.strip().lower().split()[0].rstrip(".,")
    lex = lex_raw if lex_raw in LEX_VALUES else "omitir"

    # --- TOPIC pass ---
    topic_prompt = f"{PROMPT_CLASSIFY_TOPIC}\n\nArtículo {numero} ({fuente}):\n{snippet}"
    topic_response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=32,
        messages=[{"role": "user", "content": topic_prompt}],
    )
    topic_raw = topic_response.content[0].text.strip().lower().split()[0].rstrip(".,")
    topic = topic_raw if topic_raw in TOPIC_VALUES else "otro"

    return {"fuente": fuente, "numero": numero, "texto": texto, "lex": lex, "topico": topic}


def load_intermediate(json_path: str) -> list[dict]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    fuente_raw = data.get("fuente", os.path.basename(json_path))
    fuente = FUENTE_ALIAS.get(fuente_raw, fuente_raw.replace(".txt", "").upper())
    return [
        {"fuente": fuente, "numero": a["numero"], "texto": a["texto"]}
        for a in data.get("articulos", [])
    ]


def classify_law(json_path: str, label: str) -> list[dict]:
    if not os.path.exists(json_path):
        print(f"[SKIP] No encontrado: {json_path}")
        return []

    articles = load_intermediate(json_path)
    print(f"\n{label}: {len(articles)} artículos — clasificando con Claude...")
    results = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(classify_article, a["fuente"], a["numero"], a["texto"]): a["numero"]
            for a in articles
        }
        for i, future in enumerate(as_completed(futures), 1):
            try:
                result = future.result()
                results.append(result)
                print(f"  [{i}/{len(articles)}] Art. {result['numero']} → lex:{result['lex']} | topic:{result['topico']}")
            except Exception as e:
                print(f"  [ERROR] Art. {futures[future]}: {e}")
                time.sleep(1)

    return results


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY no está definida.")
        return

    print("\n" + "=" * 70)
    print("Clasificación con Claude claude-haiku-4-5-20251001...")
    print("=" * 70)

    all_articles = []
    for path, label in [
        (LAW_21459_JSON, "Ley 21.459 — Delitos Informáticos"),
        (LAW_21521_JSON, "Ley 21.521 — Ley Fintec"),
        (LAW_21663_JSON, "Ley 21.663 — ANCI Ciberseguridad"),
    ]:
        results = classify_law(path, label)
        all_articles.extend(results)

    output = {"articulos": all_articles}
    os.makedirs(os.path.dirname(ARTICULOS_FINALES_JSON), exist_ok=True)
    with open(ARTICULOS_FINALES_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Generado: {ARTICULOS_FINALES_JSON}")
    print(f"  Total artículos clasificados: {len(all_articles)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
