# Reconstrucción del bot WiFi Rapidito

Rama de trabajo: `reconstruccion-bot-10-opciones`.

## Menú confirmado

1. 💰 ¿Cuánto debo?
2. 💳 Reportar Pago
3. 🏦 Datos Bancarios
4. 🔴 Sin Internet
5. 🟡 Internet Lento
6. 🟦 Intermitente
7. ⚠️ Falla Masiva en mi Comunidad
8. 🔑 Cambiar Clave
9. 📊 Estado de mi Servicio
10. 💜 Promesa de Pago

## Reglas funcionales confirmadas

### 1. ¿Cuánto debo?
- Consultar la factura pendiente del cliente en WispHub.
- Si no tiene facturas pendientes, informar que no debe nada.
- Para la mensualidad de USD 25, calcular `25 × tasa BCV`.
- Mostrar monto en bolívares y datos bancarios Banesco.

### 2. Reportar Pago
- Mostrar factura, datos Banesco, monto en Bs y tasa BCV.
- Preguntar modalidad:
  1. Pago Móvil Banesco → Banesco.
  2. Pago Móvil Otros Bancos → Banesco.
  3. Transferencia Banesco → Banesco.
  4. Transferencia Otros Bancos → Banesco.
- Cuando el origen sea otro banco, permitir seleccionar banco por número, código o nombre.
- Para Pago Móvil solicitar teléfono emisor.
- Solicitar últimos 6 dígitos de referencia, monto exacto y fecha.
- Mostrar resumen y pedir confirmación SI/NO.
- Confirmado: mostrar `Validando con el banco...` y ejecutar la misma validación automática Banesco que usa el portal de autogestión.
- Si se verifica: registrar pago/marcar factura pagada y reactivar servicio según el flujo existente.
- Si no se verifica: enviar a revisión manual; nunca marcar pagada sin validación positiva.
- Enviar reporte administrativo del resultado.

### 3. Datos Bancarios
- Mostrar datos Banesco para Pago Móvil y transferencia/depósito.
- Indicar al cliente que puede escribir `2` para reportar el pago.

### 4, 5 y 6. Fallas individuales
- Tipos: Sin Internet, Internet Lento, Intermitente.
- Solicitar MAC del equipo/router.
- Solicitar comunidad.
- Preguntar por luz roja/estado de luces.
- Solicitar descripción libre del problema.
- Crear ticket en WispHub.
- Usar el número real de ticket retornado por WispHub.
- Confirmar al cliente y enviar reporte administrativo.

### 7. Falla Masiva en mi Comunidad
- Mismo esquema general de falla, excepto que NO solicita MAC.
- Solicitar comunidad, estado de luces/luz roja y descripción.
- Crear ticket en WispHub y usar el número real retornado.
- Confirmar al cliente y enviar reporte administrativo.

### 8. Cambiar Clave
- Paso 1: MAC del router (12 caracteres; normalizar con `:`).
- Paso 2: comunidad o red WiFi.
- Paso 3: nueva clave WiFi, mínimo 8 caracteres y sin espacios.
- Mostrar resumen y pedir SI/NO.
- Al confirmar, crear ticket WispHub con asunto `Cambio De Contraseña En Router Wifi`.
- Mostrar número real del ticket WispHub.
- Enviar reporte administrativo con ticket, cliente, WhatsApp, ID servicio, comunidad, nueva clave y MAC.

### 9. Estado de mi Servicio
- Solo consultar y mostrar si está Activo o Suspendido.
- No crear ticket.

### 10. Promesa de Pago
- Consultar factura pendiente.
- Mostrar factura, monto y fecha máxima permitida.
- Solicitar fecha prometida y confirmar SI/NO.
- Registrar la promesa y activar/reactivar el servicio según el comportamiento histórico.
- Enviar reporte administrativo de `Promesa de Pago Registrada`.

## Reportes administrativos

Todas las gestiones relevantes envían una notificación al número administrativo configurado mediante `ADMIN_REPORT_NUMBER`.

## Integraciones

- **WhatsApp:** Meta Cloud API, conservando Evolution como fallback si ya está configurado.
- **WispHub:** identificación del cliente, facturas, estado del servicio, creación de tickets y registro de operaciones.
- **Banesco:** el bot reutiliza `proxy_payments.php`, que es el adaptador usado por el portal para validar y registrar el pago; el bot no implementa una regla bancaria paralela.
- **Promesas:** el bot reutiliza `proxy_promises.php` y `promise_restrictions.php` para respetar las mismas restricciones del portal.
- **Tickets:** el bot reutiliza `proxy.php`, por lo que la creación mantiene el formato y la compatibilidad ya probada con WispHub.
- **BCV:** se consulta la misma fuente utilizada actualmente por el formulario del portal.

## Estado de implementación

- [x] Menú de 10 opciones.
- [x] Identificación automática del cliente por el WhatsApp registrado en WispHub.
- [x] Consulta de facturas pendientes.
- [x] Cálculo de mensualidad USD 25 × tasa BCV.
- [x] Datos bancarios.
- [x] Flujo conversacional completo de Reportar Pago.
- [x] Validación Banesco reutilizando el adaptador del portal.
- [x] Reporte de pago verificado y reporte de revisión manual.
- [x] Fallas Sin Internet, Lento e Intermitente con MAC.
- [x] Falla Masiva sin solicitar MAC.
- [x] Creación de tickets WispHub y uso del número real retornado.
- [x] Cambio de clave con confirmación previa y reporte interno.
- [x] Estado Activo/Suspendido.
- [x] Promesa de Pago con ventana mensual, única factura pendiente y restricción por incumplimiento.
- [x] Reportes administrativos por WhatsApp.
- [x] Pruebas unitarias de validaciones puras en `test_bot_flows.py`.
- [ ] Prueba de punta a punta contra el VPS antes de fusionar a `main`.

## Variables nuevas o relevantes

Consultar `vps/.env.example`. Las variables principales son `WISPHUB_API_KEY`, credenciales de Meta/Evolution, `ADMIN_REPORT_NUMBER` y las URLs de los adaptadores del portal.

## Criterio de reconstrucción

La lógica confirmada por capturas tiene prioridad. Las partes aún no verificadas se mantienen como adaptadores configurables y no como supuestos rígidos.
