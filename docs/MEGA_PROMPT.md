# Mega Ultra Prompt — SaaS de Planeación Estratégica para PYMES LATAM

Actúa como un equipo senior compuesto por: consultor de estrategia, CFO, COO, CMO, gerente comercial, abogado corporativo, contador, experto en operaciones, product manager SaaS, UX/UI designer, arquitecto de software, desarrollador frontend, desarrollador backend Python, experto en datos, analista BI y growth marketer B2B.

Quiero construir una plataforma web comercializable para PYMES de Latinoamérica llamada **Planeación Master PYME LATAM**. La herramienta debe permitir que una empresa realice su planeación estratégica integral, seguimiento mensual y control ejecutivo por áreas. No debe enfocarse solo en números financieros, sino en toda la empresa: dirección estratégica, ventas, marketing, operaciones, finanzas, contabilidad, legal, talento humano, tecnología, datos, experiencia del cliente, innovación, riesgos y sostenibilidad.

## Objetivo del producto
Crear una aplicación web tipo SaaS donde una PYME pueda:
1. Registrar su empresa.
2. Diagnosticar la madurez de cada área.
3. Construir su FODA.
4. Analizar su entorno con PESTEL.
5. Definir propósito con Círculo Dorado.
6. Crear objetivos SMART por área.
7. Formular estrategias e iniciativas.
8. Crear presupuesto por área, mes y concepto.
9. Definir KPIs por área.
10. Crear cronograma y roadmap.
11. Hacer seguimiento semanal/mensual.
12. Generar dashboard ejecutivo.
13. Recibir recomendaciones automáticas.
14. Exportar reportes para socios, junta directiva o consultoría.

## Usuarios objetivo
- Dueños de PYMES.
- Gerentes generales.
- Administradores.
- Consultores empresariales.
- Cámaras de comercio.
- Restaurantes, comercios, servicios profesionales, manufactura liviana, logística, salud, educación, tecnología, construcción y empresas familiares.

## Requisitos funcionales

### Módulo 1: Onboarding
Crear formulario para capturar:
- Nombre empresa.
- País.
- Ciudad.
- Sector.
- Número de empleados.
- Ventas mensuales aproximadas.
- Años de operación.
- Canales de venta.
- Problemas principales.
- Objetivo principal de los próximos 12 meses.

### Módulo 2: Diagnóstico estratégico 360
Crear preguntas calificables de 1 a 5 por área. Cada pregunta debe tener peso. Calcular madurez por área y madurez total.

Áreas mínimas:
- Dirección estratégica.
- Ventas.
- Marketing.
- Operaciones.
- Finanzas / Contabilidad.
- Legal / Cumplimiento.
- Talento humano.
- Tecnología / Datos.
- Experiencia del cliente.
- Innovación.
- Sostenibilidad.

Fórmula:
Score pregunta = calificación / 5 × peso.
Madurez total = suma score ponderado / suma pesos × 100.

### Módulo 3: Círculo dorado
Campos:
- ¿Por qué existe la empresa?
- ¿Cómo entrega valor mejor que otros?
- ¿Qué vende o entrega?
- Promesa de valor.
- Diferenciador competitivo.

### Módulo 4: FODA priorizado
Crear tabla editable:
- Tipo: Fortaleza, Oportunidad, Debilidad, Amenaza.
- Área relacionada.
- Descripción.
- Impacto 1-5.
- Probabilidad 1-5.
- Prioridad = impacto × probabilidad.
- Acción sugerida.

Generar matriz FO, FA, DO y DA.

### Módulo 5: PESTEL
Crear análisis para:
- Político.
- Económico.
- Social.
- Tecnológico.
- Ecológico.
- Legal.

Cada factor debe tener impacto, oportunidad/amenaza, respuesta estratégica y responsable.

### Módulo 6: Objetivos SMART
Campos:
- Área.
- Objetivo.
- Métrica.
- Línea base.
- Meta.
- Fecha límite.
- Responsable.
- Estado.
- Cumplimiento automático.

### Módulo 7: Estrategias e iniciativas
Cada estrategia debe conectarse con un objetivo y contener:
- Nombre.
- Área.
- Responsable.
- Prioridad.
- Fecha inicio.
- Fecha fin.
- Presupuesto estimado.
- Estado.
- Avance porcentual.
- Riesgos.
- Dependencias.

### Módulo 8: Presupuesto por área
Crear presupuesto mensual por:
- Área.
- Categoría.
- Concepto.
- Mes.
- Planeado.
- Real.
- Variación.
- Variación %.
- Responsable.
- Comentario.

Categorías sugeridas:
- Operaciones: insumos, mantenimiento, energía, logística, calidad.
- Administración: software, papelería, servicios, asesoría.
- Ventas: comisiones, CRM, eventos, capacitación, bonos.
- Marketing: publicidad digital, campañas, diseño, redes, SEO/SEM.
- Talento humano: reclutamiento, capacitación, bienestar, desempeño.
- Finanzas: auditorías, seguros, software contable, consultoría.
- Legal: contratos, licencias, protección de datos, permisos, laboral y tributario.
- Tecnología: ERP, automatización, BI, ciberseguridad, soporte.
- Innovación: prototipos, nuevos productos, investigación de mercado.

### Módulo 9: KPIs
Campos:
- Área.
- Indicador.
- Definición.
- Fórmula.
- Meta.
- Resultado actual.
- Unidad.
- Frecuencia.
- Fuente de datos.
- Responsable.
- Semáforo: rojo, amarillo, verde.

### Módulo 10: Roadmap y cronograma
Crear vista tipo roadmap con:
- Iniciativa.
- Responsable.
- Inicio.
- Fin.
- Estado.
- Avance.
- Bloqueos.
- Próximo paso.

### Módulo 11: Dashboard ejecutivo
Debe mostrar:
- Madurez estratégica total.
- Madurez por área.
- Cumplimiento promedio de KPIs.
- Avance de iniciativas.
- Presupuesto planeado vs real.
- Desviaciones críticas.
- Iniciativas atrasadas.
- Áreas con mayor riesgo.
- Recomendaciones automáticas.

### Módulo 12: Seguimiento
Crear reuniones de seguimiento:
- Fecha.
- Tipo: semanal, mensual, trimestral.
- Decisiones tomadas.
- Compromisos.
- Responsable.
- Fecha límite.
- Estado.

## Requisitos técnicos
Crear una aplicación con:
- Frontend: HTML, CSS, JavaScript.
- Backend: Python.
- Base de datos: SQLite para MVP, PostgreSQL para SaaS.
- API REST.
- Diseño responsive.
- UI limpia, profesional, tipo dashboard ejecutivo.
- Exportación JSON desde el MVP y luego PDF/Excel.
- Arquitectura preparada para multiempresa y multiusuario.

## Modelo de datos mínimo
Diseña tablas o modelos para:
- companies
- users
- company_users
- strategic_plans
- diagnostic_questions
- diagnostic_answers
- swot_items
- pestel_items
- golden_circle
- smart_objectives
- initiatives
- tasks
- budget_lines
- kpis
- risks
- followup_meetings
- meeting_commitments
- audit_logs

## Reglas de negocio
- Ningún objetivo puede aprobarse sin métrica, meta, fecha y responsable.
- Ningún KPI debe existir sin fuente de datos y frecuencia.
- Si la variación presupuestal real > 10% del planeado, generar alerta.
- Si una iniciativa pasa su fecha fin y no está completada, marcar como atrasada.
- Si un área tiene madurez menor a 60%, sugerir plan de acción.
- Si un KPI está por debajo de 70%, marcar rojo; entre 70% y 89%, amarillo; mayor o igual a 90%, verde.

## Experiencia de usuario
La interfaz debe funcionar como un asistente paso a paso:
1. Primero captura datos de empresa.
2. Luego hace diagnóstico.
3. Luego prioriza hallazgos.
4. Luego define objetivos.
5. Luego aterriza iniciativas.
6. Luego asigna presupuesto.
7. Luego mide KPIs.
8. Luego muestra tablero y seguimiento.

Debe tener navegación lateral, tarjetas de indicadores, tablas editables, botones para agregar/eliminar, dashboard visual y recomendaciones.

## Entregables que debes generar
1. Arquitectura completa.
2. Modelo de datos.
3. API endpoints.
4. Código frontend.
5. Código backend Python.
6. Base de datos SQLite inicial.
7. Diseño CSS profesional.
8. Funciones de cálculo.
9. Recomendaciones automáticas.
10. Roadmap de evolución a SaaS comercial.

## Estilo visual
Usar una línea visual moderna, sobria y ejecutiva:
- Fondo claro.
- Sidebar oscuro.
- Color principal verde/teal.
- Tarjetas con bordes redondeados.
- Dashboard con KPIs arriba.
- Tablas limpias.
- Estados con semáforo.

## Resultado esperado
Entrega el código completo de una primera versión funcional que pueda correr localmente y servir como MVP comercializable para vender consultoría, licencias o implementación a PYMES de Latinoamérica.
