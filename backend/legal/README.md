# Pipeline legal — Detector de Phishing Bancario

Pipeline de preprocesamiento que convierte los .txt de leyes chilenas en JSON
clasificado, consumible por el agente Claude en runtime.

## Paso 1 — Bajar los .txt desde BCN

Los archivos deben ir en `raw/`:

| Archivo             | URL BCN                                                  |
|---------------------|----------------------------------------------------------|
| `ley_21459.txt`     | https://www.bcn.cl/leychile/navegar?idNorma=1177743      |
| `ley_21521.txt`     | https://www.bcn.cl/leychile/navegar?idNorma=1187323      |
| `ley_21663.txt`     | https://www.bcn.cl/leychile/navegar?idNorma=1202434      |

En BCN: botón **"Texto"** → copiar todo → pegar en el .txt correspondiente.

## Paso 2 — Instalar dependencias Python

```bash
cd backend/legal/parser
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Paso 3 — Extraer artículos (.txt → JSON)

```bash
python extract.py
```

Genera en `output/`:
- `ley_21459_articles.json`
- `ley_21521_articles.json`
- `ley_21663_articles.json`

## Paso 4 — Clasificar con Gemini (LEX + TOPIC)

Requiere credenciales de Google Vertex AI:

```bash
export GOOGLE_CLOUD_PROJECT=tu-proyecto
python classify.py
```

Genera `output/articulos_finales.json` — este es el archivo que consume el agente.

## Cómo lo consume el agente

`backend/services/legalContext.js` carga `articulos_finales.json` en memoria
(con caché) y filtra por tópico según las señales del análisis:

- URL maliciosa → inyecta artículos de `fraude_digital`, `sancion_delito`, `derecho_victima`
- Datos personales expuestos → suma `datos_personales`, `reporte_incidentes`

Los artículos relevantes se pasan en el **user message** de cada llamada a Claude,
no en el system prompt. Así Claude puede citar artículos específicos en `redFlags`.

## Cuándo re-correr

- Cuando se publique una modificación a alguna de las tres leyes
- Al agregar una ley nueva (agregar entrada en `config.py` y `classify.py`)
