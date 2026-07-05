# Cómo publicar la herramienta en línea

El proyecto ya incluye todo lo necesario (`Dockerfile`, `render.yaml`, `.gitignore`). Solo necesitas una cuenta de GitHub y una del servicio de hosting.

## Opción A: Render (recomendada, gratis)

1. Crea una cuenta en https://github.com y otra en https://render.com (puedes entrar con GitHub).
2. Crea un repositorio nuevo en GitHub llamado `planeacion-master-pyme` y sube el contenido de esta carpeta. Si tienes Git instalado:

```bash
cd planeacion_master_pyme
git init
git add .
git commit -m "Planeación Master PYME LATAM"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/planeacion-master-pyme.git
git push -u origin main
```

Si no usas Git, en GitHub elige "Add file → Upload files" y arrastra todos los archivos.

3. En Render: **New → Web Service** → conecta tu repositorio.
4. Render detecta `render.yaml` automáticamente. Confirma y despliega.
5. En 2-3 minutos tendrás una URL pública tipo `https://planeacion-master-pyme.onrender.com`.

Notas del plan gratuito de Render: el servicio "duerme" tras 15 minutos sin uso y tarda ~30 segundos en despertar. Para un servicio siempre activo, el plan Starter cuesta unos USD 7/mes.

## Opción B: Railway

1. Cuenta en https://railway.app (entra con GitHub).
2. **New Project → Deploy from GitHub repo** → elige el repositorio.
3. Railway detecta el `Dockerfile` y despliega. En Settings → Networking genera el dominio público.

## Opción C: Cualquier VPS (DigitalOcean, Hostinger, etc.)

```bash
docker build -t planeacion-master .
docker run -d -p 80:8000 --restart always -v $(pwd)/data:/app/data planeacion-master
```

## Dominio propio

En Render/Railway: sección **Custom Domain** → agrega `planeacion.tudominio.com` y crea el registro CNAME que te indiquen en tu proveedor de dominio. El certificado HTTPS es automático.

## Importante para versión comercial

Este MVP guarda el plan de cada empresa en SQLite y en el navegador del usuario. Antes de venderlo a varios clientes:

1. Agregar login de usuarios (multi-tenant) para que cada empresa vea solo su plan.
2. Migrar a PostgreSQL (Render y Railway lo ofrecen gestionado).
3. Activar respaldos automáticos de la base de datos.

Estos son los siguientes pasos naturales de desarrollo cuando quieras dar el salto a SaaS.
