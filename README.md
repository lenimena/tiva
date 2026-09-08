# TIVA V17.3 — Render + PostgreSQL

TIVA V17.3 está preparada para Render con PostgreSQL. Si existe `DATABASE_URL`, usa PostgreSQL; en local, si no existe, mantiene SQLite para desarrollo.

## Render
1. Crear un Render Postgres en la misma región del Web Service.
2. En el Web Service, definir `DATABASE_URL` con la **Internal Database URL** del Postgres.
3. Definir `PRESTADORES_ADMIN_USER` y `PRESTADORES_ADMIN_PASSWORD` como variables secretas.
4. Mantener Start Command: `python server.py`.
5. Al desplegar, TIVA crea automáticamente sus tablas.

## Recibos
Con PostgreSQL, los comprobantes se guardan en la tabla privada `receipts` como datos binarios, evitando depender del disco efímero del servicio gratuito.

## Local
Sin `DATABASE_URL`, TIVA usa SQLite y puede arrancarse con `python server.py`.

## Documentos de prestadores
El administrador autenticado puede abrir/descargar la cédula y ver la foto de cada solicitud pendiente. Los archivos se almacenan en PostgreSQL cuando DATABASE_URL está configurada. Al aprobar, la foto queda asociada al perfil público del prestador mediante /api/provider-photo. La cédula permanece restringida al administrador.
