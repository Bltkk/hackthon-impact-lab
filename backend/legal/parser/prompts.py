PROMPT_CLASSIFY_LEX = """Eres un abogado especialista en derecho digital y ciberseguridad chileno.

Clasifica el siguiente artículo de ley en UNA categoría jurídica:

- sancion_penal     → establece penas privativas de libertad o multas penales
- sancion_admin     → multas, suspensiones o revocaciones administrativas (CMF, ANCI)
- obligacion        → impone un deber de hacer: reportar, implementar, proteger
- prohibicion       → impone un deber de no hacer: no acceder, no interceptar, no usar
- definicion        → define un concepto jurídico o técnico
- derecho_usuario   → establece un derecho para ciudadanos, usuarios o víctimas
- procedimiento     → describe trámites, plazos o flujos regulatorios
- omitir            → artículo transitorio, referencial o sin relevancia operativa directa

Artículo {numero} — {fuente}:
{texto}

Responde en JSON con los campos: categoria, razonamiento.
El razonamiento debe ser una sola oración que justifique la categoría elegida.
"""

PROMPT_CLASSIFY_TOPIC = """Eres un experto en ciberseguridad y fraude bancario digital en Chile.

Clasifica el siguiente artículo de ley según la materia que regula,
en el contexto de un sistema de detección de phishing bancario:

- fraude_digital         → fraude informático, estafa por medios electrónicos
- phishing_suplantacion  → phishing, smishing, vishing, suplantación de identidad
- acceso_ilicito         → acceso no autorizado a sistemas o datos
- datos_personales       → protección, tratamiento o fuga de datos personales
- ciberseguridad         → medidas técnicas de seguridad, estándares, rol de ANCI
- reporte_incidentes     → obligación de notificar brechas o incidentes de seguridad
- sancion_delito         → penas aplicables al atacante o infractor
- derecho_victima        → derechos y recursos disponibles para la víctima
- fintech_regulacion     → registro en CMF, requisitos para prestadores de servicios
- definicion_tecnica     → definición de sistema informático, dato, dispositivo, red
- otro                   → materia que no aplica al contexto de fraude bancario digital

Artículo {numero} — {fuente}:
{texto}

Responde en JSON con los campos: topico, razonamiento.
El razonamiento debe ser una sola oración que explique por qué este artículo es relevante (o no) para detectar phishing bancario.
"""
