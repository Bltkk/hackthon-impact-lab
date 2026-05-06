import re
import json
import os
from config import LAW_21459_TXT, LAW_21521_TXT, LAW_21663_TXT, \
                   LAW_21459_JSON, LAW_21521_JSON, LAW_21663_JSON


# Extrae todos los artículos de un archivo .txt de ley chilena y los retorna como lista estructurada
def extract_articles_from_txt(txt_path):
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'Art[ií]culo\s+(\d+)\s*[º°]?\s*\.?\s*-'
    matches = list(re.finditer(pattern, content, re.MULTILINE | re.IGNORECASE))

    def is_quoted(match):
        line_start = content.rfind('\n', 0, match.start())
        start = max(line_start + 1, match.start() - 5)
        before = content[start:match.start()]
        return '"' in before or '“' in before or '«' in before

    valid = [m for m in matches if not is_quoted(m)]

    articles = []
    seen_numbers = set()
    for i, match in enumerate(valid):
        number = int(match.group(1))

        is_transitory = number in seen_numbers
        seen_numbers.add(number)
        label = f"T-{number}" if is_transitory else str(number)

        text_start = match.end()
        text_end = valid[i + 1].start() if i + 1 < len(valid) else len(content)
        body = content[text_start:text_end].strip()

        body = re.sub(r'Ley\s+\d+\s+Art\.\s+\w+\s+Nº\s+\d+\s+D\.O\.\s+\d{2}\.\d{2}\.\d{4}', '', body)

        if len(body) < 5:
            continue

        articles.append({'numero': label, 'texto': body})

    return {
        'fuente': os.path.basename(txt_path),
        'total_articulos': len(articles),
        'articulos': articles
    }


# Guarda un diccionario como archivo JSON en la ruta indicada, creando el directorio si no existe
def save_json(data, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Guardado: {output_path}")


def main():
    print("\n" + "="*70)
    print("Convirtiendo archivos .txt a JSON...")
    print("="*70)

    documents = [
        {"txt": LAW_21459_TXT, "output": LAW_21459_JSON, "label": "Ley 21.459 — Delitos Informáticos"},
        {"txt": LAW_21521_TXT, "output": LAW_21521_JSON, "label": "Ley 21.521 — Ley Fintec"},
        {"txt": LAW_21663_TXT, "output": LAW_21663_JSON, "label": "Ley 21.663 — ANCI Ciberseguridad"},
    ]

    results = []
    for doc in documents:
        if not os.path.exists(doc["txt"]):
            print(f"[SKIP] No encontrado: {doc['txt']}")
            continue

        print(f"\nProcesando: {doc['label']}")
        data = extract_articles_from_txt(doc["txt"])
        save_json(data, doc["output"])
        print(f"   Total artículos: {data['total_articulos']}")
        results.append(data)

    print("\n" + "="*70)
    print("Extracción completada")
    print("="*70)

    return results


if __name__ == "__main__":
    main()
