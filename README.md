# rot.lealclub.com

App personal (PWA) de bienestar y Road of Love. Privada, un solo usuario.

## Fase 1 (esta versión)
- Pantallas: Hoy (agenda del día en hora de Caracas, según la Bitácora), Agua, Ejercicio, Sueño, Perfil y gratitud diaria.
- Funciona sin conexión y se instala en el teléfono ("Agregar a pantalla de inicio").
- Sin llaves de Supabase corre en **modo local** (datos solo en el teléfono).

## Desarrollo
```
npm install
cp .env.example .env.local   # llaves públicas de Supabase
npm run dev
```

## Despliegue (Cloudflare Pages)
- Build: `npm run build` · Salida: `dist`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Dominio: rot.lealclub.com

## Seguridad
- Esquema en `supabase/migrations/0001_init.sql`: RLS en todas las tablas, sin acceso anónimo.
- En Supabase Auth: desactivar registros nuevos (solo el usuario del dueño).
- Nunca subir `.env.local` ni la llave `service_role`.
- Cabeceras de seguridad en `public/_headers`.
