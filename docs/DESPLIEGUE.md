# Cómo publicar la herramienta en línea

El proyecto incluye todo lo necesario (`Dockerfile`, `render.yaml`, `.gitignore`). Solo necesitas cuenta de GitHub y del servicio de hosting.

## Opción A: Render (recomendada para empezar, gratis)

### 1. Sube el código a GitHub
- Crea cuenta en https://github.com
- Crea un repositorio nuevo llamado `planeacion-master-pyme` (privado o público)
- Sube los archivos: botón **Add file → Upload files** y arrastra TODO el contenido de la carpeta (server.py, Dockerfile, render.yaml, .gitignore, static/, docs/)
- O con Git instalado:

```bash
cd planeacion_master_pyme
git init
git add .
git commit -m "Planeación Master PYME v3"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/planeacion-master-pyme.git
git push -u origin main
```

### 2. Despliega en Render
- Crea cuenta en https://render.com (botón "Sign in with GitHub")
- Dashboard → **New → Web Service**
- Autoriza acceso y elige el repositorio `planeacion-master-pyme`
- Render lee `render.yaml` automáticamente → **Deploy**
- En 2-3 minutos tendrás tu URL: `https://planeacion-master-pyme.onrender.com`

### 3. Actualizaciones futuras
Cada vez que subas cambios a GitHub (`git push` o Upload files), Render redespliega solo.

### Limitaciones del plan gratuito de Render
- El servicio "duerme" tras 15 min sin uso; despierta en ~30-60 segundos.
- **La base de datos SQLite se borra en cada redespliegue o reinicio** (el plan gratuito no tiene disco persistente). Para pruebas y demos está bien.
- Para uso comercial real: plan **Starter (~USD 7/mes) + disco persistente (1 GB)**. En el servicio: Settings → Disks → Add Disk, mount path `/opt/render/project/src/data`. Con eso los usuarios y planes quedan guardados permanentemente.

## Opción B: Railway (alternativa, con volumen persistente)

1. Cuenta en https://railway.app (entra con GitHub)
2. **New Project → Deploy from GitHub repo** → elige el repositorio
3. Railway detecta el `Dockerfile` y despliega
4. Settings → Networking → **Generate Domain** para la URL pública
5. Para persistencia: clic derecho en el servicio → **Attach Volume**, mount path `/app/data`

## Opción C: VPS propio (DigitalOcean, Hostinger, etc.)

```bash
docker build -t planeacion-master .
docker run -d -p 80:8000 --restart always -v $(pwd)/data:/app/data planeacion-master
```

## Dominio propio

En Render/Railway: **Custom Domain** → agrega `app.tudominio.com` → crea el registro CNAME que te indiquen en tu proveedor de dominio. HTTPS es automático.

## Seguridad ya incluida en v3

- Contraseñas cifradas con PBKDF2-SHA256 (200.000 iteraciones + salt).
- Sesiones con cookies HttpOnly + SameSite (14 días).
- Cada usuario solo ve las empresas donde es miembro (multi-tenant).

## Siguiente nivel (cuando tengas clientes pagando)

1. Migrar SQLite → PostgreSQL gestionado (Render y Railway lo ofrecen).
2. Respaldos automáticos de la base de datos.
3. Recuperación de contraseña por correo.
4. Roles adicionales (consultor de solo lectura, editor por área).
