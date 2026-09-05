const RAPIDITO_PROMISE = Object.freeze({
  endpoint: 'https://wifirapidito.com/promise_email_ingest.php',
  sender: 'notificaciones@wisphub.site',
  subjectPrefix: 'Success Corte Incumplimiento Promesa de Pago User',
  processedLabel: 'Rapidito/PromesaIncumplidaProcesada',
  errorLabel: 'Rapidito/PromesaIncumplidaError',
  timezone: 'America/Caracas',
});

/**
 * Ejecutar UNA sola vez al instalar el script.
 * Crea las etiquetas, fija la fecha de inicio y programa revisión cada 5 min.
 * Los correos anteriores a la instalación NO se procesan.
 */
function installRapiditoPromiseAutomation() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('RAPIDITO_INSTALLED_AT_MS')) {
    props.setProperty('RAPIDITO_INSTALLED_AT_MS', String(Date.now()));
  }

  getOrCreateLabel_(RAPIDITO_PROMISE.processedLabel);
  getOrCreateLabel_(RAPIDITO_PROMISE.errorLabel);

  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'processRapiditoPromiseEmails')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('processRapiditoPromiseEmails')
    .timeBased()
    .everyMinutes(5)
    .create();
}

/**
 * Busca únicamente avisos auténticos de corte por incumplimiento de promesa.
 * Cada hilo se etiqueta como procesado solo después de que el backend confirma.
 */
function processRapiditoPromiseEmails() {
  const props = PropertiesService.getScriptProperties();
  const installedAtMs = Number(props.getProperty('RAPIDITO_INSTALLED_AT_MS') || '0');
  if (!installedAtMs) {
    throw new Error('Primero ejecuta installRapiditoPromiseAutomation().');
  }

  const processedLabel = getOrCreateLabel_(RAPIDITO_PROMISE.processedLabel);
  const errorLabel = getOrCreateLabel_(RAPIDITO_PROMISE.errorLabel);
  const query = [
    `from:${RAPIDITO_PROMISE.sender}`,
    `subject:"${RAPIDITO_PROMISE.subjectPrefix}"`,
    `-label:"${RAPIDITO_PROMISE.processedLabel}"`,
    'newer_than:14d',
    '-in:spam',
    '-in:trash',
  ].join(' ');

  const threads = GmailApp.search(query, 0, 100);
  threads.forEach(thread => {
    const messages = thread.getMessages();
    let processedAny = false;
    let hadError = false;

    messages.forEach(message => {
      if (message.getDate().getTime() <= installedAtMs) return;

      const from = String(message.getFrom() || '').toLowerCase();
      const subject = String(message.getSubject() || '').trim();
      if (!from.includes(RAPIDITO_PROMISE.sender)) return;
      if (!subject.startsWith(RAPIDITO_PROMISE.subjectPrefix)) return;

      try {
        const result = sendRestrictionEvent_(message);
        if (result.success) processedAny = true;
      } catch (error) {
        hadError = true;
        console.error(`Rapidito promise automation: ${message.getId()} ${error.message}`);
      }
    });

    if (processedAny && !hadError) {
      thread.addLabel(processedLabel);
      thread.removeLabel(errorLabel);
    } else if (hadError) {
      thread.addLabel(errorLabel);
    }
  });
}

function sendRestrictionEvent_(message) {
  const idToken = ScriptApp.getIdentityToken();
  if (!idToken) {
    throw new Error('Google no entregó identity token. Revisa los scopes openid/userinfo.email.');
  }

  const payload = {
    gmail_message_id: String(message.getId()),
    from: String(message.getFrom() || ''),
    subject: String(message.getSubject() || '').trim(),
    incident_date: Utilities.formatDate(message.getDate(), RAPIDITO_PROMISE.timezone, 'yyyy-MM-dd'),
  };

  const response = UrlFetchApp.fetch(RAPIDITO_PROMISE.endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  let data = {};
  try {
    data = JSON.parse(response.getContentText() || '{}');
  } catch (_) {
    data = {};
  }

  if (code >= 200 && code < 300 && data.success) return data;
  const detail = data.error || `HTTP ${code}`;
  throw new Error(`Backend rechazó ${payload.gmail_message_id}: ${detail}`);
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/**
 * Diagnóstico manual, no crea restricciones históricas.
 */
function healthRapiditoPromiseAutomation() {
  const response = UrlFetchApp.fetch(`${RAPIDITO_PROMISE.endpoint}?health=1`, {
    muteHttpExceptions: true,
  });
  console.log(`HTTP ${response.getResponseCode()} ${response.getContentText()}`);
}
