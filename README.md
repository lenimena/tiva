# TIVA V18.4 — Render + PostgreSQL

TIVA V17.4 está preparada para Render con PostgreSQL. Si existe `DATABASE_URL`, usa PostgreSQL; en local, si no existe, mantiene SQLite para desarrollo.

## Render
1. Crear un Render Postgres en la misma región del Web Service.
2. En el Web Service, definir `DATABASE_URL` con la **Internal Database URL** del Postgres.
3. Definir `PRESTADORES_ADMIN_USER` y `PRESTADORES_ADMIN_PASSWORD` como variables secretas.
4. Mantener Start Command: `python server.py`.
5. Al desplegar, TIVA crea automáticamente sus tablas.

## Local
Sin `DATABASE_URL`, TIVA usa SQLite y puede arrancarse con `python server.py`.

## Documentos de prestadores
El administrador autenticado puede abrir/descargar la cédula y ver la foto de cada solicitud pendiente. Los archivos se almacenan en PostgreSQL cuando DATABASE_URL está configurada. Al aprobar, la foto queda asociada al perfil público del prestador mediante /api/provider-photo. La cédula permanece restringida al administrador.


V17.4 corrige la revisión de solicitudes: normaliza solicitudes que ya tienen cédula y foto recibidas aunque hayan quedado con estado subiendo_documentos, y hace robusta la selección por ID al abrir/revisar.


V18.4: renovación por Link de Pago Nequi, sin carga de comprobantes ni observaciones. El formulario valida que el prestador exista por WhatsApp y servicio. El administrador verifica el pago en Nequi Negocios y, al aprobar, actualiza el registro existente del prestador. Tarifas: mensual $20.000 COP y anual $100.000 COP.

V18.3: acceso a renovación únicamente desde el menú superior público; eliminado el botón y modal de renovación manual del panel administrativo.

V18.4: la aprobación de renovación se realiza en el servidor sobre el registro existente, evitando crear duplicados y manteniendo la fecha original de registro.
