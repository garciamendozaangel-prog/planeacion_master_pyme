#!/usr/bin/env python3
"""
Planeación Master PYME LATAM v3 - Backend con autenticación multi-empresa.
Sin dependencias externas: solo Python 3.
Run: python server.py
Open: http://localhost:8000
"""
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DB_PATH = BASE_DIR / "data" / "planeacion_master.sqlite3"
PORT = int(os.environ.get("PORT", "8000"))
SESSION_DAYS = 14

AREAS = [
    "Dirección Estratégica",
    "Ventas",
    "Marketing",
    "Operaciones",
    "Finanzas / Contabilidad",
    "Legal / Cumplimiento",
    "Talento Humano",
    "Tecnología / Datos",
    "Experiencia del Cliente",
    "Innovación",
    "Sostenibilidad / ESG",
]

DIAGNOSTIC_QUESTIONS = [
    # Dirección Estratégica
    {"area": "Dirección Estratégica", "question": "¿Tiene misión, visión, propósito y valores claros y comunicados?", "weight": 10},
    {"area": "Dirección Estratégica", "question": "¿La empresa cuenta con objetivos anuales medibles y priorizados?", "weight": 10},
    {"area": "Dirección Estratégica", "question": "¿Existe un comité o reunión periódica donde se revisan avances y se toman decisiones?", "weight": 8},
    # Ventas
    {"area": "Ventas", "question": "¿Existe un embudo comercial con metas, responsables y seguimiento semanal?", "weight": 9},
    {"area": "Ventas", "question": "¿Conoce el ticket promedio, la tasa de cierre y el costo de adquisición de clientes?", "weight": 8},
    {"area": "Ventas", "question": "¿Tiene una base de clientes organizada con historial de compras y contacto?", "weight": 7},
    # Marketing
    {"area": "Marketing", "question": "¿La empresa mide adquisición, conversión y retorno de campañas?", "weight": 8},
    {"area": "Marketing", "question": "¿Tiene una propuesta de valor diferenciada y comunicada en todos los canales?", "weight": 7},
    {"area": "Marketing", "question": "¿Mantiene presencia digital activa (redes, Google, WhatsApp Business) con contenido regular?", "weight": 6},
    # Operaciones
    {"area": "Operaciones", "question": "¿Los procesos clave están documentados con tiempos, responsables y estándares?", "weight": 9},
    {"area": "Operaciones", "question": "¿Mide productividad, mermas, desperdicios o tiempos muertos?", "weight": 7},
    {"area": "Operaciones", "question": "¿Tiene control de inventarios y proveedores con criterios de calidad y costo?", "weight": 7},
    # Finanzas / Contabilidad
    {"area": "Finanzas / Contabilidad", "question": "¿Tiene presupuesto, flujo de caja, costos, márgenes y punto de equilibrio actualizados?", "weight": 10},
    {"area": "Finanzas / Contabilidad", "question": "¿Separa finanzas personales de las de la empresa y conoce su rentabilidad real?", "weight": 9},
    {"area": "Finanzas / Contabilidad", "question": "¿Revisa estados financieros mensualmente para tomar decisiones?", "weight": 8},
    # Legal / Cumplimiento
    {"area": "Legal / Cumplimiento", "question": "¿Tiene contratos, permisos, protección de datos, obligaciones tributarias y laborales controladas?", "weight": 8},
    {"area": "Legal / Cumplimiento", "question": "¿Los empleados están formalizados con contratos y seguridad social al día?", "weight": 7},
    # Talento Humano
    {"area": "Talento Humano", "question": "¿Tiene roles, perfiles, metas, capacitación y evaluación de desempeño?", "weight": 7},
    {"area": "Talento Humano", "question": "¿Mide rotación, clima laboral y tiene plan de retención de personal clave?", "weight": 6},
    # Tecnología / Datos
    {"area": "Tecnología / Datos", "question": "¿Usa datos confiables, herramientas digitales y automatización para decidir?", "weight": 8},
    {"area": "Tecnología / Datos", "question": "¿La información crítica está respaldada y protegida contra pérdida o ataques?", "weight": 6},
    # Experiencia del Cliente
    {"area": "Experiencia del Cliente", "question": "¿Mide satisfacción, quejas, recompra, reseñas y fidelización?", "weight": 7},
    {"area": "Experiencia del Cliente", "question": "¿Tiene un proceso definido para resolver quejas y recuperar clientes?", "weight": 6},
    # Innovación
    {"area": "Innovación", "question": "¿Tiene iniciativas para nuevos productos, canales, alianzas o eficiencia?", "weight": 6},
    {"area": "Innovación", "question": "¿Dedica tiempo o presupuesto a probar ideas nuevas de forma estructurada?", "weight": 5},
    # Sostenibilidad / ESG
    {"area": "Sostenibilidad / ESG", "question": "¿Gestiona impacto ambiental, seguridad, comunidad y reputación?", "weight": 4},
    {"area": "Sostenibilidad / ESG", "question": "¿Cumple normas de seguridad laboral y gestión de residuos de su sector?", "weight": 4},
]

PESTEL_FACTORS = ["Político", "Económico", "Social", "Tecnológico", "Ecológico", "Legal"]
SWOT_TYPES = ["Fortaleza", "Oportunidad", "Debilidad", "Amenaza"]
STATUS_OPTIONS = ["No iniciado", "En proceso", "Bloqueado", "Completado"]
PRIORITY_OPTIONS = ["Alta", "Media", "Baja"]
MEETING_TYPES = ["Semanal", "Mensual", "Trimestral"]
COMMITMENT_STATUS = ["Pendiente", "En proceso", "Cumplido", "Vencido"]

SECTORS = [
    "Restaurante / Alimentos",
    "Comercio / Retail",
    "Servicios profesionales",
    "Manufactura",
    "Logística / Transporte",
    "Salud",
    "Educación",
    "Tecnología",
    "Construcción",
    "Turismo / Hotelería",
    "Belleza / Bienestar",
    "Otro",
]

# Base de conocimiento del motor de recomendaciones: por sector y por área débil.
SECTOR_PLAYBOOKS = {
    "Restaurante / Alimentos": [
        "Controla el costo de receta estándar por plato: apunta a food cost entre 28% y 32%.",
        "Activa recompra con WhatsApp Business: base de clientes + promociones de martes a jueves.",
        "Mide merma diaria de insumos críticos; una reducción de 2 puntos suele valer más que subir precios.",
        "Publica y responde reseñas en Google Maps: es el canal de adquisición más barato del sector.",
    ],
    "Comercio / Retail": [
        "Clasifica inventario ABC: el 20% de productos suele generar el 80% del margen.",
        "Mide rotación de inventario mensual y liquida producto lento cada trimestre.",
        "Implementa venta cruzada en caja y por WhatsApp con combos de alta rotación.",
        "Negocia plazos con proveedores para financiar inventario sin crédito bancario.",
    ],
    "Servicios profesionales": [
        "Define paquetes con precio cerrado en lugar de cobrar solo por hora: mejora margen y venta.",
        "Sistematiza referidos: pide recomendación activa al cerrar cada proyecto exitoso.",
        "Mide utilización del equipo (horas facturables / horas disponibles): apunta a 70%+.",
        "Crea contratos de retainer mensual para estabilizar el flujo de caja.",
    ],
    "Manufactura": [
        "Calcula el costo real por unidad incluyendo mano de obra, energía y desperdicio.",
        "Implementa mantenimiento preventivo: cada parada no planeada cuesta 3-5x más.",
        "Mide OEE (disponibilidad × rendimiento × calidad) en la línea principal.",
        "Diversifica clientes: ninguno debería superar el 30% de la facturación.",
    ],
    "Logística / Transporte": [
        "Mide costo por kilómetro y por entrega: es la base de una tarifa rentable.",
        "Controla combustible y mantenimiento por vehículo con indicadores semanales.",
        "Reduce kilómetros vacíos con planeación de rutas y cargas de retorno.",
        "Formaliza contratos con clientes recurrentes para asegurar volumen base.",
    ],
    "Salud": [
        "Reduce inasistencias con recordatorios automáticos por WhatsApp: apunta a <10% de no-show.",
        "Mide ocupación de agenda por profesional y ajusta horarios a demanda real.",
        "Asegura cumplimiento de habilitación, historia clínica y protección de datos del paciente.",
        "Crea planes de control/seguimiento recurrente: fidelizan y estabilizan ingresos.",
    ],
    "Educación": [
        "Mide retención de estudiantes por cohorte: retener cuesta 5x menos que captar.",
        "Diversifica ingresos con cursos cortos, certificaciones o modalidad virtual.",
        "Sistematiza la comunicación con padres/estudiantes para reducir deserción.",
        "Mide y publica resultados de aprendizaje: son tu mejor argumento comercial.",
    ],
    "Tecnología": [
        "Mide MRR, churn y CAC/LTV mensualmente: son los signos vitales del negocio.",
        "Documenta el producto y el onboarding para reducir carga de soporte.",
        "Enfócate en un nicho vertical antes de expandir: facilita ventas y referidos.",
        "Formaliza contratos de soporte/mantenimiento recurrente con clientes actuales.",
    ],
    "Construcción": [
        "Controla avance de obra vs presupuesto semanalmente: las desviaciones se detectan tarde.",
        "Exige anticipos y actas de corte parciales para proteger el flujo de caja.",
        "Gestiona pólizas, seguridad industrial y permisos antes de iniciar cada obra.",
        "Mantén una base de subcontratistas evaluados por calidad y cumplimiento.",
    ],
    "Turismo / Hotelería": [
        "Mide ocupación, tarifa promedio (ADR) y RevPAR mensualmente.",
        "Reduce dependencia de OTAs incentivando reserva directa con beneficios.",
        "Gestiona reputación online: responde el 100% de reseñas en 48 horas.",
        "Crea paquetes para temporada baja con aliados locales.",
    ],
    "Belleza / Bienestar": [
        "Implementa agenda digital con recordatorios: reduce inasistencias hasta 40%.",
        "Crea membresías o planes prepagados para estabilizar ingresos.",
        "Mide frecuencia de visita por cliente y activa recordatorios de recompra.",
        "Vende productos complementarios: pueden aportar 15-25% de ingresos extra.",
    ],
}

AREA_ACTION_PLANS = {
    "Dirección Estratégica": ["Agenda un comité mensual con agenda fija: resultados, desviaciones, decisiones y compromisos.", "Define máximo 3 objetivos anuales y comunícalos a todo el equipo."],
    "Ventas": ["Construye un embudo simple: prospectos → cotizados → cerrados, con metas semanales.", "Organiza la base de clientes y activa recompra con los que no compran hace 60+ días."],
    "Marketing": ["Define tu propuesta de valor en una frase y úsala en todos los canales.", "Concentra el presupuesto en el canal que hoy trae más clientes medibles."],
    "Operaciones": ["Documenta los 3 procesos que más afectan al cliente con responsable y estándar.", "Mide una semana de mermas/tiempos muertos para encontrar el mayor desperdicio."],
    "Finanzas / Contabilidad": ["Separa cuentas personales y de la empresa este mes.", "Arma flujo de caja semanal a 8 semanas: es la herramienta #1 de supervivencia PYME."],
    "Legal / Cumplimiento": ["Haz checklist de permisos, contratos y obligaciones tributarias con fechas de vencimiento.", "Formaliza los contratos laborales pendientes: el riesgo laboral es el más caro."],
    "Talento Humano": ["Define roles y responsables por escrito: elimina el 'todos hacen de todo'.", "Implementa una conversación de desempeño trimestral de 30 minutos por persona."],
    "Tecnología / Datos": ["Activa respaldo automático de la información crítica esta semana.", "Centraliza ventas y clientes en una sola herramienta (aunque sea una hoja de cálculo bien diseñada)."],
    "Experiencia del Cliente": ["Mide satisfacción con una pregunta post-venta (NPS simple) por WhatsApp.", "Define un protocolo de quejas: responder en <24h y registrar la causa."],
    "Innovación": ["Reserva 2 horas al mes para revisar qué están haciendo competidores y clientes.", "Prueba una idea nueva por trimestre con presupuesto y fecha límite definidos."],
    "Sostenibilidad / ESG": ["Cumple primero lo normativo: seguridad laboral y manejo de residuos.", "Comunica tus prácticas responsables: los clientes jóvenes las valoran al comprar."],
}

BUDGET_CATEGORIES = {
    "Operaciones": ["Insumos y materiales", "Mantenimiento", "Fletes", "Energía", "Logística interna", "Transporte", "Calidad"],
    "Administración": ["Servicios básicos", "Software de gestión", "Papelería", "Asesoría legal", "Mantenimiento de sistemas"],
    "Ventas": ["Comisiones", "CRM", "Eventos comerciales", "Capacitación en ventas", "Material de apoyo", "Viajes", "Bonos"],
    "Marketing": ["Publicidad digital", "Campañas promocionales", "Diseño gráfico", "Eventos de marca", "Gestión de redes", "SEO / SEM"],
    "Talento Humano": ["Reclutamiento", "Capacitación", "Bienestar", "Evaluaciones", "Vacantes", "Eventos internos"],
    "Finanzas / Contabilidad": ["Consultoría financiera", "Software contable", "Auditorías", "Seguros", "Gestión de activos"],
    "Legal / Cumplimiento": ["Contratos", "Licencias y permisos", "Protección de datos", "Cumplimiento laboral", "Cumplimiento tributario"],
    "Tecnología / Datos": ["ERP / CRM", "Automatizaciones", "Ciberseguridad", "BI / Dashboards", "Soporte técnico"],
    "Innovación": ["Prototipos", "Investigación de mercado", "Nuevas líneas", "Alianzas", "Pruebas piloto"],
}

SCHEMA = {
    "areas": AREAS,
    "diagnostic_questions": DIAGNOSTIC_QUESTIONS,
    "pestel_factors": PESTEL_FACTORS,
    "swot_types": SWOT_TYPES,
    "status_options": STATUS_OPTIONS,
    "priority_options": PRIORITY_OPTIONS,
    "budget_categories": BUDGET_CATEGORIES,
    "meeting_types": MEETING_TYPES,
    "commitment_status": COMMITMENT_STATUS,
    "sectors": SECTORS,
    "sector_playbooks": SECTOR_PLAYBOOKS,
    "area_action_plans": AREA_ACTION_PLANS,
}

DEMO_PLAN = {
    "company": {"name": "Empresa Demo LATAM", "country": "Colombia", "city": "Barranquilla", "sector": "Restaurante / Alimentos", "employees": 12},
    "goldenCircle": {
        "why": "Ayudar a más clientes a vivir una experiencia memorable, rentable y escalable.",
        "how": "Estandarizando procesos, midiendo indicadores y activando ventas con datos.",
        "what": "Un plan estratégico 360 con objetivos, presupuesto, KPIs y seguimiento semanal.",
    },
    "diagnostic": {},
    "swot": [
        {"type": "Fortaleza", "area": "Operaciones", "text": "Producto con buena aceptación del mercado", "impact": 4, "probability": 4},
        {"type": "Debilidad", "area": "Finanzas / Contabilidad", "text": "Control de costos aún manual", "impact": 5, "probability": 4},
    ],
    "pestel": [
        {"factor": "Económico", "description": "Alta sensibilidad del cliente al precio", "impact": 4, "opportunity": "Crear combos y control de margen"},
    ],
    "objectives": [
        {"area": "Ventas", "objective": "Incrementar ventas mensuales en 15%", "metric": "Ventas COP", "baseline": 50000000, "target": 57500000, "deadline": "2026-12-31", "owner": "Gerente Comercial"},
    ],
    "initiatives": [
        {"area": "Ventas", "name": "Campaña de recompra por WhatsApp", "owner": "Líder Comercial", "priority": "Alta", "status": "En proceso", "start": "2026-07-01", "end": "2026-08-15", "progress": 35},
    ],
    "kpis": [
        {"area": "Ventas", "name": "Ventas mensuales", "target": 57500000, "actual": 50000000, "unit": "COP", "owner": "Gerente Comercial"},
        {"area": "Marketing", "name": "Leads calificados", "target": 300, "actual": 120, "unit": "leads", "owner": "Marketing"},
    ],
    "budget": [
        {"area": "Marketing", "concept": "Publicidad digital", "planned": 1500000, "actual": 1200000, "month": "Julio"},
        {"area": "Operaciones", "concept": "Insumos y materiales", "planned": 8000000, "actual": 8960000, "month": "Julio"},
    ],
    "meetings": [
        {"date": "2026-07-01", "type": "Mensual", "decision": "Aprobar campaña de recompra", "commitment": "Lanzar campaña WhatsApp a base de clientes", "owner": "Líder Comercial", "deadline": "2026-07-15", "status": "En proceso"},
    ],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 200_000).hex()
    return salt, digest


def send_reset_email(to_email: str, link: str) -> bool:
    """Envía el enlace de recuperación. Si no hay SMTP configurado, lo imprime en los logs."""
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASS")
    if not (host and user and password):
        print(f"[RECUPERACION] Enlace para {to_email}: {link}", flush=True)
        return False
    import smtplib
    from email.message import EmailMessage
    msg = EmailMessage()
    msg["Subject"] = "Restablece tu contraseña - Planeación Master PYME"
    msg["From"] = os.environ.get("SMTP_FROM", user)
    msg["To"] = to_email
    msg.set_content(
        "Hola,\n\nPara restablecer tu contraseña entra a:\n" + link +
        "\n\nEl enlace vence en 30 minutos. Si no lo solicitaste, ignora este correo."
    )
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
        return True
    except Exception as exc:
        print(f"[RECUPERACION] Error enviando correo: {exc}. Enlace: {link}", flush=True)
        return False


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    with connect() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                country TEXT,
                city TEXT,
                sector TEXT,
                employees INTEGER,
                revenue REAL,
                created_at TEXT NOT NULL
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS company_users (
                company_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'owner',
                created_at TEXT NOT NULL,
                PRIMARY KEY (company_id, user_id),
                FOREIGN KEY(company_id) REFERENCES companies(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS reset_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS plans (
                company_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(company_id) REFERENCES companies(id)
            )
            """
        )


class AppHandler(BaseHTTPRequestHandler):
    server_version = "PlaneacionMaster/3.0"

    def log_message(self, format: str, *args) -> None:  # cleaner console
        print("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), format % args))

    # ---------- helpers ----------
    def _json(self, data, status=200, extra_headers=None):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        for key, value in (extra_headers or []):
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def _session_token(self):
        cookie = self.headers.get("Cookie", "") or ""
        for part in cookie.split(";"):
            key, _, value = part.strip().partition("=")
            if key == "pm_session" and value:
                return value
        return None

    def _current_user(self):
        token = self._session_token()
        if not token:
            return None
        with connect() as con:
            row = con.execute(
                "SELECT s.expires_at, u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?",
                (token,),
            ).fetchone()
        if not row or row["expires_at"] < now_iso():
            return None
        return {"id": row["id"], "email": row["email"], "name": row["name"]}

    def _require_user(self):
        user = self._current_user()
        if not user:
            self._json({"error": "Debes iniciar sesión"}, 401)
        return user

    def _is_member(self, user_id: str, company_id: str) -> bool:
        with connect() as con:
            return con.execute(
                "SELECT 1 FROM company_users WHERE user_id=? AND company_id=?", (user_id, company_id)
            ).fetchone() is not None

    def _create_session(self, user_id: str):
        token = secrets.token_hex(32)
        expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat()
        with connect() as con:
            con.execute(
                "INSERT INTO sessions(token, user_id, expires_at, created_at) VALUES(?,?,?,?)",
                (token, user_id, expires, now_iso()),
            )
        cookie = f"pm_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_DAYS * 86400}"
        return [("Set-Cookie", cookie)]

    def _user_companies(self, user_id: str):
        with connect() as con:
            rows = con.execute(
                """
                SELECT c.*, cu.role FROM companies c
                JOIN company_users cu ON cu.company_id = c.id
                WHERE cu.user_id = ?
                ORDER BY c.created_at
                """,
                (user_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    # ---------- HTTP ----------
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == "/api/health":
            return self._json({"ok": True, "service": "Planeación Master PYME LATAM", "version": 3, "time": now_iso()})
        if path == "/api/schema":
            return self._json(SCHEMA)
        if path == "/api/demo":
            return self._json(DEMO_PLAN)
        if path == "/api/auth/me":
            user = self._current_user()
            if not user:
                return self._json({"error": "Sin sesión activa"}, 401)
            return self._json({"user": user, "companies": self._user_companies(user["id"])})
        if path == "/api/plan":
            user = self._require_user()
            if not user:
                return None
            company_id = qs.get("company_id", [None])[0]
            if not company_id:
                return self._json({"error": "Falta company_id"}, 400)
            if not self._is_member(user["id"], company_id):
                return self._json({"error": "No tienes acceso a esta empresa"}, 403)
            with connect() as con:
                row = con.execute("SELECT payload, updated_at FROM plans WHERE company_id=?", (company_id,)).fetchone()
            if not row:
                return self._json({"company_id": company_id, "plan": None})
            return self._json({"company_id": company_id, "updated_at": row["updated_at"], "plan": json.loads(row["payload"])})

        return self._serve_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        data = self._read_json()
        if data is None:
            return self._json({"error": "JSON inválido"}, 400)

        if parsed.path == "/api/auth/register":
            name = (data.get("name") or "").strip()
            email = (data.get("email") or "").strip().lower()
            password = data.get("password") or ""
            if not email or "@" not in email:
                return self._json({"error": "Correo inválido"}, 400)
            if len(password) < 8:
                return self._json({"error": "La contraseña debe tener mínimo 8 caracteres"}, 400)
            salt, digest = hash_password(password)
            user_id = str(uuid.uuid4())
            try:
                with connect() as con:
                    con.execute(
                        "INSERT INTO users(id, email, name, password_salt, password_hash, created_at) VALUES(?,?,?,?,?,?)",
                        (user_id, email, name, salt, digest, now_iso()),
                    )
            except sqlite3.IntegrityError:
                return self._json({"error": "Ya existe una cuenta con ese correo"}, 409)
            headers = self._create_session(user_id)
            return self._json({"user": {"id": user_id, "email": email, "name": name}, "companies": []}, 201, headers)

        if parsed.path == "/api/auth/login":
            email = (data.get("email") or "").strip().lower()
            password = data.get("password") or ""
            with connect() as con:
                row = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            if not row:
                return self._json({"error": "Correo o contraseña incorrectos"}, 401)
            _, digest = hash_password(password, row["password_salt"])
            if not secrets.compare_digest(digest, row["password_hash"]):
                return self._json({"error": "Correo o contraseña incorrectos"}, 401)
            headers = self._create_session(row["id"])
            user = {"id": row["id"], "email": row["email"], "name": row["name"]}
            return self._json({"user": user, "companies": self._user_companies(row["id"])}, 200, headers)

        if parsed.path == "/api/auth/logout":
            token = self._session_token()
            if token:
                with connect() as con:
                    con.execute("DELETE FROM sessions WHERE token=?", (token,))
            headers = [("Set-Cookie", "pm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")]
            return self._json({"ok": True}, 200, headers)

        if parsed.path == "/api/auth/forgot":
            email = (data.get("email") or "").strip().lower()
            with connect() as con:
                row = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
            if row:
                token = secrets.token_hex(24)
                expires = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
                with connect() as con:
                    con.execute(
                        "INSERT INTO reset_tokens(token, user_id, expires_at, created_at) VALUES(?,?,?,?)",
                        (token, row["id"], expires, now_iso()),
                    )
                host = self.headers.get("Host") or f"localhost:{PORT}"
                scheme = "http" if host.startswith("localhost") or host.startswith("127.") else "https"
                link = f"{scheme}://{host}/?reset={token}"
                send_reset_email(email, link)
            return self._json({"ok": True, "message": "Si el correo está registrado, enviamos un enlace de recuperación."})

        if parsed.path == "/api/auth/reset":
            token = data.get("token") or ""
            password = data.get("password") or ""
            if len(password) < 8:
                return self._json({"error": "La contraseña debe tener mínimo 8 caracteres"}, 400)
            with connect() as con:
                row = con.execute("SELECT * FROM reset_tokens WHERE token=?", (token,)).fetchone()
            if not row or row["expires_at"] < now_iso():
                return self._json({"error": "El enlace no es válido o ya venció. Solicita uno nuevo."}, 400)
            salt, digest = hash_password(password)
            with connect() as con:
                con.execute("UPDATE users SET password_salt=?, password_hash=? WHERE id=?", (salt, digest, row["user_id"]))
                con.execute("DELETE FROM reset_tokens WHERE token=?", (token,))
                con.execute("DELETE FROM sessions WHERE user_id=?", (row["user_id"],))
            headers = self._create_session(row["user_id"])
            with connect() as con:
                user_row = con.execute("SELECT id, email, name FROM users WHERE id=?", (row["user_id"],)).fetchone()
            user = {"id": user_row["id"], "email": user_row["email"], "name": user_row["name"]}
            return self._json({"user": user, "companies": self._user_companies(user["id"])}, 200, headers)

        if parsed.path == "/api/companies":
            user = self._require_user()
            if not user:
                return None
            company_id = str(uuid.uuid4())
            company = data or {}
            with connect() as con:
                con.execute(
                    """
                    INSERT INTO companies(id, name, country, city, sector, employees, revenue, created_at)
                    VALUES(?,?,?,?,?,?,?,?)
                    """,
                    (
                        company_id,
                        company.get("name") or "Empresa sin nombre",
                        company.get("country"),
                        company.get("city"),
                        company.get("sector"),
                        int(company.get("employees") or 0),
                        float(company.get("revenue") or 0),
                        now_iso(),
                    ),
                )
                con.execute(
                    "INSERT INTO company_users(company_id, user_id, role, created_at) VALUES(?,?,?,?)",
                    (company_id, user["id"], "owner", now_iso()),
                )
            return self._json({"company_id": company_id, "company": {**company, "id": company_id}}, 201)

        if parsed.path == "/api/plan/save":
            user = self._require_user()
            if not user:
                return None
            company_id = data.get("company_id")
            plan = data.get("plan")
            if not company_id or not isinstance(plan, dict):
                return self._json({"error": "Se requiere company_id y plan"}, 400)
            if not self._is_member(user["id"], company_id):
                return self._json({"error": "No tienes acceso a esta empresa"}, 403)
            with connect() as con:
                con.execute(
                    """
                    INSERT INTO plans(company_id, payload, updated_at)
                    VALUES(?,?,?)
                    ON CONFLICT(company_id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at
                    """,
                    (company_id, json.dumps(plan, ensure_ascii=False), now_iso()),
                )
            return self._json({"ok": True, "company_id": company_id, "updated_at": now_iso()})

        return self._json({"error": "Ruta no encontrada"}, 404)

    def _serve_static(self, path: str):
        if path in ("/", ""):
            target = STATIC_DIR / "index.html"
        else:
            clean = path.lstrip("/")
            target = STATIC_DIR / clean
        try:
            target = target.resolve()
            if not str(target).startswith(str(STATIC_DIR.resolve())) or not target.exists() or target.is_dir():
                self.send_error(404, "Archivo no encontrado")
                return
            ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            content = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as exc:
            self.send_error(500, str(exc))


def main() -> None:
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), AppHandler)
    print(f"Planeación Master PYME LATAM v3 corriendo en http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
