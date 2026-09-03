# Wifi Rapidito Android 6.0.3

Esta compilación incorpora el `PromiseGate` del portal antes de `RequestPromise`.

La app consulta `promise_restrictions.php` con el `service_id` y `username` autenticados. Si el cliente está bloqueado por incumplimiento de una promesa anterior, no se muestra el formulario para crear una nueva promesa. El backend mantiene además la validación obligatoria al registrar la promesa.

El flujo de publicación conserva temporalmente el alias `Wifi-Rapidito-6.0.2.apk` para que el botón de descarga actualmente publicado en la web entregue la compilación corregida mientras la página se actualiza a 6.0.3.
