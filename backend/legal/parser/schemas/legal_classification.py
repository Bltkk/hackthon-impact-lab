from pydantic import BaseModel
from typing import Literal


# ── Pass 1: LEX — tipo jurídico del artículo ──────────────────────��─────────
class ClasificacionLex(BaseModel):
    categoria: Literal[
        "sancion_penal",      # Penas privativas de libertad, multas penales
        "sancion_admin",      # Multas, suspensiones, revocaciones CMF/ANCI
        "obligacion",         # Deber de hacer: reportar, proteger, implementar
        "prohibicion",        # Deber de no hacer: no acceder, no interceptar
        "definicion",         # Define conceptos jurídicos o técnicos
        "derecho_usuario",    # Derecho del ciudadano/consumidor/víctima
        "procedimiento",      # Trámites, plazos, flujos regulatorios
        "omitir",             # Transitorio, referencia, sin relevancia operativa
    ]
    razonamiento: str


# ── Pass 2: TOPIC — materia del artículo ────────────────────────────────────
class ClasificacionTopic(BaseModel):
    topico: Literal[
        "fraude_digital",         # Fraude informático, estafa digital
        "phishing_suplantacion",  # Phishing, smishing, vishing, suplantación
        "acceso_ilicito",         # Acceso no autorizado a sistemas
        "datos_personales",       # Protección, tratamiento, fuga de datos
        "ciberseguridad",         # Medidas técnicas, estándares, ANCI
        "reporte_incidentes",     # Obligación de notificar brechas/incidentes
        "sancion_delito",         # Penas aplicables al atacante
        "derecho_victima",        # Qué puede hacer/reclamar la víctima
        "fintech_regulacion",     # Registro CMF, requisitos prestadores
        "definicion_tecnica",     # Definición de sistema, dato, dispositivo
        "otro",
    ]
    razonamiento: str


# ── Artículo final ensamblado ────────────────────────────────────────────────
class ArticuloFinal(BaseModel):
    numero: str
    fuente: str
    texto: str
    categoria: str
    topico: str
    razonamiento_lex: str
    razonamiento_topic: str


# ── Output completo del pipeline ─────────────────────────────────────────────
class OutputFinal(BaseModel):
    total_procesados: int
    total_omitidos: int
    total_errores: int
    total_clasificados: int
    articulos: list[ArticuloFinal]
