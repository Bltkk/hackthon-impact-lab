"""
Clasificador local por palabras clave.
Genera articulos_finales.json SIN necesitar Google API.
Produce el mismo schema que classify.py para que legalContext.js lo consuma igual.

Uso:
    python classify_local.py
"""

import json
import os
from config import LAW_21459_JSON, LAW_21521_JSON, LAW_21663_JSON, ARTICULOS_FINALES_JSON

# ── Reglas de clasificación ──────────────────────────────────────────────────
# Cada tópico tiene keywords. Se evalúa el texto del artículo (lowercase).
# El primer tópico cuyas keywords hacen match gana.
# Si ninguno hace match → "otro" (legalContext.js lo ignora).

TOPIC_RULES = [
    ("fraude_digital", [
        "fraude", "perjuicio", "beneficio económico", "manipule", "engaño",
        "estafa", "phishing", "smishing", "vishing",
    ]),
    ("phishing_suplantacion", [
        "suplantación", "identidad supuesta", "identidad falsa", "hacerse pasar",
        "apariencia", "falsificación", "auténticos", "autenticidad",
    ]),
    ("acceso_ilicito", [
        "acceso", "acceder", "autorización", "sin autorización", "barreras técnicas",
        "medidas tecnológicas", "sistema informático", "interceptación", "intercepte",
    ]),
    ("datos_personales", [
        "dato personal", "datos personales", "tratamiento de datos", "consentimiento",
        "titular de los datos", "privacidad", "datos tratados",
    ]),
    ("ciberseguridad", [
        "ciberseguridad", "incidente de ciberseguridad", "vulnerabilidad", "resiliencia",
        "agencia nacional de ciberseguridad", "anci", "operador de importancia vital",
        "seguridad de la información", "riesgo cibernético",
    ]),
    ("reporte_incidentes", [
        "reportar", "notificar", "deber de reporte", "comunicación responsable",
        "reporte", "notificación", "incidente", "csirt",
    ]),
    ("sancion_delito", [
        "presidio", "multa", "pena", "sanción", "castigado", "penado",
        "infracción", "delito", "responsabilidad penal",
    ]),
    ("derecho_victima", [
        "víctima", "denuncia", "reparación", "indemnización", "derecho del usuario",
        "protección al cliente", "resarcimiento", "afectado",
    ]),
    ("fintech_regulacion", [
        "comisión para el mercado financiero", "cmf", "registro de prestadores",
        "fintec", "plataforma de financiamiento", "sistema alternativo de transacción",
        "finanzas abiertas", "open banking", "prestador de servicios financieros",
        "custodia", "enrutamiento", "asesoría crediticia", "asesoría de inversión",
    ]),
    ("definicion_tecnica", [
        "se entenderá por", "para efectos de esta ley", "definición", "significa",
        "se define", "concepto", "entiéndase",
    ]),
]

LEX_RULES = [
    ("sancion_penal",  ["presidio", "reclusión", "pena privativa"]),
    ("sancion_admin",  ["multa", "infracción grave", "cancelación de inscripción", "sanción administrativa"]),
    ("obligacion",     ["deberá", "deberán", "obligación", "deber de", "estarán obligados"]),
    ("prohibicion",    ["prohíbe", "prohibición", "no podrá", "no podrán", "queda prohibido"]),
    ("definicion",     ["se entenderá por", "para efectos de", "significa", "se define"]),
    ("derecho_usuario",["derecho del usuario", "protección al cliente", "podrá exigir", "podrán solicitar"]),
    ("procedimiento",  ["procedimiento", "plazo", "solicitud", "autorización previa", "tramitación"]),
]

# Alias fuente: nombre del archivo → etiqueta limpia
FUENTE_ALIAS = {
    "ley_21459.txt": "LEY_21459",
    "ley_21521.txt": "LEY_21521",
    "ley_21663.txt": "LEY_21663",
}


def classify_topic(texto: str) -> str:
    t = texto.lower()
    for topic, keywords in TOPIC_RULES:
        if any(kw in t for kw in keywords):
            return topic
    return "otro"


def classify_lex(texto: str) -> str:
    t = texto.lower()
    for lex, keywords in LEX_RULES:
        if any(kw in t for kw in keywords):
            return lex
    return "omitir"


def load_intermediate(json_path: str) -> list[dict]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    fuente_raw = data.get("fuente", os.path.basename(json_path))
    fuente = FUENTE_ALIAS.get(fuente_raw, fuente_raw.replace(".txt", "").upper())
    return [
        {"fuente": fuente, "numero": a["numero"], "texto": a["texto"]}
        for a in data.get("articulos", [])
    ]


def main():
    print("\n" + "=" * 70)
    print("Clasificación local por keywords (sin API)...")
    print("=" * 70)

    all_articles = []
    for path, label in [
        (LAW_21459_JSON, "Ley 21.459"),
        (LAW_21521_JSON, "Ley 21.521"),
        (LAW_21663_JSON, "Ley 21.663"),
    ]:
        if not os.path.exists(path):
            print(f"[SKIP] No encontrado: {path}")
            continue
        arts = load_intermediate(path)
        print(f"\n{label}: {len(arts)} artículos")
        for a in arts:
            a["lex"]    = classify_lex(a["texto"])
            a["topico"] = classify_topic(a["texto"])
        # Stats
        from collections import Counter
        topics = Counter(a["topico"] for a in arts)
        for t, n in topics.most_common():
            print(f"   {t}: {n}")
        all_articles.extend(arts)

    # Filtrar "omitir" del lex (no del tópico — legalContext filtra por tópico)
    final = [a for a in all_articles if a["lex"] != "omitir" or a["topico"] != "otro"]

    output = {"articulos": final}
    os.makedirs(os.path.dirname(ARTICULOS_FINALES_JSON), exist_ok=True)
    with open(ARTICULOS_FINALES_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Generado: {ARTICULOS_FINALES_JSON}")
    print(f"  Total artículos clasificados: {len(final)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
