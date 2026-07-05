# Planeación Master PYME LATAM — v3 (multi-empresa)

Plataforma web de planeación estratégica integral para PYMES de Latinoamérica, con cuentas de usuario y soporte multi-empresa. Lista para publicar en línea (ver `docs/DESPLIEGUE.md`).

## Novedades v3: autenticación multi-empresa

- **Registro e inicio de sesión** con correo y contraseña (PBKDF2-SHA256, 200k iteraciones + salt).
- **Sesiones seguras** con cookies HttpOnly + SameSite, válidas 14 días.
- **Multi-empresa**: cada usuario puede crear y administrar varias empresas; cada plan queda ligado a su empresa.
- **Aislamiento de datos**: el servidor valida membresía en cada lectura/guardado — un usuario solo ve sus empresas (base multi-tenant para vender a varios clientes).
- **Selector de empresa** en la barra lateral + botón "Nueva empresa" + cerrar sesión.

## Funcionalidad completa (v2)

- Diagnóstico 360 con 27 preguntas ponderadas en 11 áreas y madurez por área.
- Círculo dorado, FODA priorizado + matriz cruzada FO/FA/DO/DA automática.
- PESTEL, objetivos SMART, iniciativas con roadmap.
- Presupuesto con alerta automática si la desviación supera el 10%.
- KPIs con semáforo (rojo <70%, amarillo 70-89%, verde ≥90%).
- Seguimiento y comité: reuniones, decisiones, compromisos + agenda automática.
- Motor de recomendaciones inteligentes: 11 playbooks por sector + planes de acción para áreas débiles.
- Dashboard ejecutivo con alertas, gráficos y recomendaciones.

## Cómo correrlo localmente

```bash
cd planeacion_master_pyme
python server.py
```

Abre `http://localhost:8000`, crea tu cuenta y empieza. Sin dependencias externas: solo Python 3.

## Cómo publicarlo en línea

Ver **`docs/DESPLIEGUE.md`**: guía paso a paso para Render (gratis), Railway o VPS con Docker.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Crear cuenta {name, email, password} |
| POST | /api/auth/login | Iniciar sesión {email, password} |
| POST | /api/auth/logout | Cerrar sesión |
| GET | /api/auth/me | Usuario actual + sus empresas |
| POST | /api/companies | Crear empresa (requiere sesión) |
| GET | /api/plan?company_id= | Leer plan (requiere membresía) |
| POST | /api/plan/save | Guardar plan (requiere membresía) |
| GET | /api/schema | Catálogos y base de conocimiento |
| GET | /api/health | Estado del servicio |

## Modelo de datos

users · sessions · companies · company_users (roles) · plans

## Roadmap comercial

1. Planes de suscripción (básico, pro, consultor) con pasarela de pago.
2. Invitar usuarios a una empresa (equipo) con roles de lectura/edición.
3. Exportación PDF/Excel de reportes ejecutivos.
4. Recuperación de contraseña por correo.
5. Migración a PostgreSQL + respaldos automáticos.
6. Alertas por correo/WhatsApp.
