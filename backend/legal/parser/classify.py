import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from google import genai
from google.genai import types

from config import LAW_21459_JSON, LAW_21521_JSON, LAW_21663_JSON, ARTICULOS_FINALES_JSON
from prompts import PROMPT_CLASSIFY_LEX, PROMPT_CLASSIFY_TOPIC
from schemas.legal_classification import ClasificacionLex, ClasificacionTopic, ArticuloFinal, OutputFinal


def get_gemini_client():
    return genai.Client(vertexai=True)


def call_gemini(prompt, schema, client):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
                response_json_schema=schema,
            ),
        )
        return response.text, None
    except Exception as e:
        return None, str(e)


def process_lex(article, source, client):
    """Pass 1: Legal categorization (Lex)"""
    prompt = PROMPT_CLASSIFY_LEX.format(
        numero=article["numero"], fuente=source, texto=article["texto"]
    )
    raw_text, err = call_gemini(prompt, ClasificacionLex.model_json_schema(), client)
    if err:
        return article["numero"], None, err
    return article["numero"], ClasificacionLex.model_validate_json(raw_text), None


def process_topic(article, source, client):
    """Pass 2: Subject matter categorization (Topic)"""
    prompt = PROMPT_CLASSIFY_TOPIC.format(
        numero=article["numero"], fuente=source, texto=article["texto"]
    )
    raw_text, err = call_gemini(prompt, ClasificacionTopic.model_json_schema(), client)
    if err:
        return article["numero"], None, err
    return article["numero"], ClasificacionTopic.model_validate_json(raw_text), None


def run_two_pass_pipeline(articles, source, client, max_workers=12):
    """
    Processes articles in two separate parallel passes to ensure
    LEX failures/omissions don't waste TOPIC tokens.
    """
    lex_results = {}
    omitted_count = 0
    error_count = 0

    # PASS 1: LEX
    print(f"\n[1/2] LEX pass for {source}: {len(articles)} articles...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_lex, art, source, client): art for art in articles}
        for f in as_completed(futures):
            num, res, err = f.result()
            if err:
                error_count += 1
                print(f"  Art {num} -> LEX ERROR: {err}")
            else:
                lex_results[num] = res
                if res.categoria == "omitir":
                    omitted_count += 1
                print(f"  Art {num} -> LEX: {res.categoria}")

    # Filter for Pass 2 (exclude errors and 'omitir')
    topic_queue = [
        a for a in articles
        if a["numero"] in lex_results and lex_results[a["numero"]].categoria != "omitir"
    ]

    # PASS 2: TOPIC
    topic_results = {}
    print(f"\n[2/2] TOPIC pass: {len(topic_queue)} articles...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_topic, art, source, client): art for art in topic_queue}
        for f in as_completed(futures):
            num, res, err = f.result()
            if err:
                error_count += 1
                print(f"  Art {num} -> TOPIC ERROR: {err}")
            else:
                topic_results[num] = res
                print(f"  Art {num} -> TOPIC: {res.topico}")

    # Assembly
    final_classified = []
    for art in articles:
        num = art["numero"]
        if num in topic_results:
            lx = lex_results[num]
            tp = topic_results[num]
            final_classified.append(
                ArticuloFinal(
                    numero=num, fuente=source, texto=art["texto"],
                    categoria=lx.categoria, topico=tp.topico,
                    razonamiento_lex=lx.razonamiento,
                    razonamiento_topic=tp.razonamiento,
                )
            )
    return final_classified, omitted_count, error_count


def main():
    client = get_gemini_client()
    all_final = []
    total_omitted = total_errors = total_input = 0

    # Tres leyes: Delitos Informáticos, Fintec, Ciberseguridad
    datasets = [
        (LAW_21459_JSON, "LEY_21459"),
        (LAW_21521_JSON, "LEY_21521"),
        (LAW_21663_JSON, "LEY_21663"),
    ]

    for path, source in datasets:
        if not os.path.exists(path):
            print(f"[SKIP] JSON no encontrado: {path} — corre extract.py primero")
            continue

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            articles = data["articulos"]
            total_input += len(articles)

            results, omitted, errors = run_two_pass_pipeline(articles, source, client)
            all_final.extend(results)
            total_omitted += omitted
            total_errors += errors

    output = OutputFinal(
        total_procesados=total_input,
        total_omitidos=total_omitted,
        total_errores=total_errors,
        total_clasificados=len(all_final),
        articulos=all_final,
    )

    os.makedirs(os.path.dirname(ARTICULOS_FINALES_JSON), exist_ok=True)
    with open(ARTICULOS_FINALES_JSON, "w", encoding="utf-8") as f:
        json.dump(output.model_dump(), f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"FINISHED: {len(all_final)} artículos clasificados.")
    print(f"Omitidos: {total_omitted} | Errores: {total_errors}")
    print(f"Output: {ARTICULOS_FINALES_JSON}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
