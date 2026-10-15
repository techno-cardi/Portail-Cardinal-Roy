/**
 * Cardinal-Roy : synchronisation de TOUTES les dates du calendrier dédié.
 * Exécuter ce code uniquement dans un projet Apps Script du compte scolaire.
 * Aucun déploiement Web public n'est nécessaire.
 *
 * Configurer Script Properties > GITHUB_PAT (fine-grained, contents:write).
 * Exécuter installCardinalSync() une seule fois pour créer le déclencheur.
 */
const CARDINAL_CALENDAR_ID = 'c_8527e24b6f9dc9f028439fcf5c2a3657475698c9e4151ac93cd2d9205b322baa@group.calendar.google.com';
const CARDINAL_DISPATCH_URL = 'https://api.github.com/repos/techno-cardi/Portail-Cardinal-Roy/dispatches';
const CARDINAL_EVENT_TYPE = 'cardinal_dates_subscription_update';
const CARDINAL_MAX_EVENTS = 180;

// Calendrier dédié : aucun filtrage des titres, la sélection éditoriale est
// faite directement dans Google Agenda avant toute synchronisation.

function syncCardinalDates() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  if (!token) throw new Error('Ajouter GITHUB_PAT dans les propriétés du script.');
  const calendar = CalendarApp.getCalendarById(CARDINAL_CALENDAR_ID);
  if (!calendar) throw new Error('Le compte scolaire ne peut pas lire le calendrier Cardinal-Roy.');

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 91 * 24 * 3600000);
  const eligible = calendar.getEvents(start, end);
  if (eligible.length > CARDINAL_MAX_EVENTS) {
    throw new Error('Plus de 180 dates : export interrompu sans suppression silencieuse.');
  }
  const events = eligible.map(function(evt) {
    return {
      title: evt.getTitle().trim(),
      start: evt.getStartTime().toISOString(),
      end: evt.getEndTime().toISOString(),
      all_day: evt.isAllDayEvent()
    };
  });
  const payload = JSON.stringify({
    event_type: CARDINAL_EVENT_TYPE,
    client_payload: {
      schema: 1,
      calendar_id: CARDINAL_CALENDAR_ID,
      generated_at: new Date().toISOString(),
      events: events
    }
  });
  if (payload.length > 55000) throw new Error('Volume trop élevé pour la livraison GitHub.');
  const response = UrlFetchApp.fetch(CARDINAL_DISPATCH_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: payload,
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 204) {
    throw new Error('GitHub a refusé la livraison (HTTP ' + response.getResponseCode() + ').');
  }
  console.log('Dates du calendrier partagé transmises : ' + events.length + '.');
}

function installCardinalSync() {
  // Vérifier d'abord que le compte scolaire et GitHub sont accessibles.
  // En cas d'erreur, conserver les déclencheurs existants sans les supprimer.
  syncCardinalDates();
  const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'syncCardinalDates';
  });
  if (!existing) {
    ScriptApp.newTrigger('syncCardinalDates').timeBased().everyMinutes(15).create();
  }
  console.log('Synchronisation Cardinal-Roy activée, sans déclencheur en double.');
}
