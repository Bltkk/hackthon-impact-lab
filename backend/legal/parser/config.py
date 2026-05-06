import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR  = os.path.join(BASE_DIR, "..", "raw")
OUT_DIR  = os.path.join(BASE_DIR, "..", "output")

# ── Input .txt files (descargar desde BCN y pegar aquí) ──────────────────────
LAW_21459_TXT  = os.path.join(RAW_DIR, "ley_21459.txt")   # Delitos Informáticos
LAW_21521_TXT  = os.path.join(RAW_DIR, "ley_21521.txt")   # Ley Fintec
LAW_21663_TXT  = os.path.join(RAW_DIR, "ley_21663.txt")   # Ley Marco Ciberseguridad

# ── Intermediate JSON (output del parser, input del clasificador) ─────────────
LAW_21459_JSON = os.path.join(OUT_DIR, "ley_21459_articles.json")
LAW_21521_JSON = os.path.join(OUT_DIR, "ley_21521_articles.json")
LAW_21663_JSON = os.path.join(OUT_DIR, "ley_21663_articles.json")

# ── Final classified JSON (consumido por el agente Claude) ───────────────────
ARTICULOS_FINALES_JSON = os.path.join(OUT_DIR, "articulos_finales.json")

# ── Alias requeridos por extract.py y classify.py (código base) ─────────────
# extract.py espera LAW_19886_TXT / DECREE_661_TXT — mapeamos a los nuestros
LAW_19886_TXT   = LAW_21459_TXT
DECREE_661_TXT  = LAW_21521_TXT
LAW_19886_JSON  = LAW_21459_JSON
DECREE_661_JSON = LAW_21521_JSON
