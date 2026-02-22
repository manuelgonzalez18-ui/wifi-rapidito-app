# Guía de Despliegue en Hostinger

Sigue estos pasos para desplegar tu aplicación React correctamente en Hostinger.

## 1. Preparar la Construcción (Build)

En tu terminal local (Visual Studio Code), ejecuta:
```bash
npm run build
```
Esto creará una carpeta `dist` con todos los archivos listos para producción.
**IMPORTANTE:** Asegúrate de que dentro de `dist` estén los archivos `.htaccess` y `proxy.php`.

## 2. Preparar Hostinger (Administrador de Archivos)

1.  Entra a tu panel de Hostinger -> **Administrador de Archivos** (File Manager).
2.  Navega a la carpeta `public_html`.
3.  **LIMPIEZA:** Si es posible, borra todo lo que haya actualmente en `public_html` (¡haz un backup primero si tienes cosas importantes ajenas a esta app!).

## 3. Subir Archivos

La configuración actual de tu proyecto espera funcionar dentro de una carpeta `/dist/`.

### Opción A (Recomendada según tu configuración actual):
1.  En `public_html`, sube el archivo `index.php` que está en la raiz de tu proyecto (el que redirige a `/dist/`).
2.  En `public_html`, crea una carpeta llamada `dist`.
3.  Entra a la carpeta `dist`.
4.  Sube **TODO EL CONTENIDO** de tu carpeta local `dist` (arrastra los archivos `assets`, `index.html`, `.htaccess`, `proxy.php`, etc.).

**Estructura Final en Hostinger:**
```
public_html/
├── index.php         (Redirige a /dist/)
└── dist/
    ├── index.html
    ├── .htaccess     (Muy importante para las rutas)
    ├── proxy.php     (Muy importante para la API)
    ├── check.php     (Para diagnóstico)
    └── assets/       (Carpeta con js y css)
```

## 4. Verificar

1.  Abre tu navegador y ve a `www.wifirapidito.com`. Debería redirigirte automáticamente a `www.wifirapidito.com/dist/` y mostrar la app.
2.  **Prueba de Diagnóstico:** Ve a `www.wifirapidito.com/dist/check.php`.
    *   Deberías ver un reporte de texto.
    *   Fíjate si dice "ÉXITO: El servidor puede contactar a Wisphub".
3.  **Prueba de API:** Ve a `www.wifirapidito.com/dist/api/check`.
    *   Si ves el mismo reporte que en el paso 2, ¡Felicidades! Las rutas (Rewrite Rules) funcionan bien.
    *   Si ves un error 404, el archivo `.htaccess` no se subió o no está funcionando.

## Solución de Problemas Comunes

*   **Pantalla Blanca:** Abre la consola del navegador (F12) -> Console. Si ves errores rojos de "Failed to load resource... 404", significa que los archivos no están donde el `index.html` los busca. Revisa la estructura de carpetas.
*   **Error 404 en Login:** Significa que el `proxy.php` no está siendo accedido correctamente. Verifica el paso de "Prueba de API" arriba.
