# Bambu Tracker

App para llevar el control de la impresora Bambu Lab P1S compartida entre Javi y Nacho: compras de filamento, coste y quién pagó, impresiones realizadas (para Javi, Nacho o un tercero), gramos de filamento consumidos por cada uno, stock restante por bobina y balance de gasto entre los dos.

Incluye sincronización opcional del historial de impresiones desde la cuenta cloud de Bambu Lab (integración no oficial, ver aviso más abajo).

## Estructura

- `backend/`: API en FastAPI + SQLAlchemy async + SQLite.
- `frontend/`: SPA en React + TypeScript + Vite, servida por nginx en producción.

## Puesta en marcha

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend (API directa): http://localhost:8000/docs

La base de datos SQLite y las fotos subidas viven en el volumen `bambu_data` (persiste entre reinicios).

El umbral de "stock bajo" que se avisa en el Dashboard se configura con `STOCK_BAJO_UMBRAL_G` en `.env` (por defecto 200 g). Cada impresión con bobina y gramos asignados muestra su coste (precio de esa bobina × gramos usados), y tanto compras como impresiones se pueden exportar a CSV desde sus respectivas pantallas.

## Sincronización con Bambu Cloud

Desde la pestaña **Ajustes** se conecta la cuenta de Bambu Lab (email + contraseña + código de verificación por email) y luego el botón **Sincronizar ahora** de la pestaña **Impresiones** trae el historial de impresiones nuevo, que queda pendiente de revisión hasta asignarle persona/bobina/gramos.

**Si la cuenta se creó con Google (u otro login social):** la API de Bambu Lab no admite login solo-OAuth, hace falta fijar antes una contraseña propia de la cuenta (una sola vez): en la app móvil Bambu Handy, icono de perfil → Account Security → Change Password (o "he olvidado mi contraseña" en bambulab.com si esa opción no aparece). Después ya se puede usar ese email + contraseña en la pantalla de Ajustes.

**Aviso:** esta integración usa la API cloud de Bambu Lab de forma no oficial (no hay API pública documentada). Si Bambu cambia su backend, la sincronización puede dejar de funcionar; en ese caso siempre queda la opción de registrar las impresiones a mano.

## Desarrollo

Backend:
```bash
cd backend
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```
