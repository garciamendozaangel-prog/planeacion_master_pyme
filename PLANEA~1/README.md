# Planeación Master PYME LATAM

MVP funcional para convertir un modelo de planeación estratégica en una herramienta web comercializable para PYMES de Latinoamérica.

## Qué incluye

- Frontend en HTML, CSS y JavaScript puro.
- Backend en Python sin dependencias externas.
- Base de datos SQLite.
- Módulos:
  - Perfil de empresa.
  - Círculo dorado.
  - Diagnóstico estratégico 360.
  - FODA priorizado.
  - PESTEL.
  - Objetivos SMART.
  - Estrategias e iniciativas.
  - Presupuesto por área.
  - KPIs.
  - Dashboard ejecutivo y roadmap.

## Cómo correrlo

```bash
cd planeacion_master_pyme
python server.py
```

Abre en el navegador:

```text
http://localhost:8000
```

## Estructura

```text
planeacion_master_pyme/
├── server.py                 # Backend Python + API + SQLite
├── static/
│   ├── index.html            # Interfaz principal
│   ├── styles.css            # Diseño profesional responsive
│   └── app.js                # Lógica de formularios, cálculos y dashboard
├── data/
│   └── planeacion_master.sqlite3  # Se crea al ejecutar
└── docs/
    ├── MEGA_PROMPT.md        # Prompt maestro para seguir desarrollando
    └── FLUJO_MASTER.md       # Flujo funcional completo
```

## Próximos pasos para comercializar

1. Migrar autenticación: usuarios, roles y empresas multi-tenant.
2. Crear planes de suscripción: básico, pro y consultor.
3. Agregar exportación PDF/Excel de reportes.
4. Agregar IA para recomendaciones automáticas por sector.
5. Agregar alertas por correo/WhatsApp para KPIs vencidos, presupuesto excedido e iniciativas atrasadas.
6. Conectar datos reales: POS, CRM, contabilidad, Google Sheets, Excel, WhatsApp Business o ERP.

## Modelo de datos recomendado para versión SaaS

- companies
- users
- company_users
- strategic_plans
- diagnostic_answers
- swot_items
- pestel_items
- smart_objectives
- initiatives
- tasks
- kpis
- budget_lines
- meetings
- risks
- documents
- audit_logs

## Fórmulas clave

- Score diagnóstico por pregunta = calificación / 5 × peso.
- Madurez estratégica = suma score ponderado / suma pesos × 100.
- Cumplimiento KPI = actual / meta × 100, con tope visual a 100%.
- Avance iniciativas = promedio de progreso de iniciativas.
- Variación presupuesto = real - planeado.
- Prioridad FODA = impacto × probabilidad.

