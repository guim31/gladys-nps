// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, connection status, action
// messages, widget contents, scene outputs), in the four languages of the
// Gladys interface. Entries are strings or functions of one parameter object.
// German says "du", Spanish "usted". Park names and alert titles are the
// NPS's, in English: they never translate.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Connection status shown on the integration page (setConnectionStatus).
export const STATUS = {
  keyInvalid: {
    en: 'The NPS API key is not valid: check it in the configuration.',
    fr: "La clé de l'API NPS n'est pas valide : vérifiez-la dans la configuration.",
    de: 'Der NPS-API-Schlüssel ist ungültig: prüfe ihn in der Konfiguration.',
    es: 'La clave de la API NPS no es válida: verifíquela en la configuración.',
  },
  rateLimit: {
    en: 'Request limit of the NPS API reached: get your own free key (see the guide).',
    fr: "Limite de requêtes de l'API NPS atteinte : prenez votre propre clé gratuite (voir le guide).",
    de: 'Anfragelimit der NPS-API erreicht: hol dir deinen eigenen kostenlosen Schlüssel (siehe Anleitung).',
    es: 'Límite de solicitudes de la API NPS alcanzado: obtenga su propia clave gratuita (vea la guía).',
  },
  unreachable: {
    en: 'The NPS API does not answer: the alerts will be read again at the next refresh.',
    fr: "L'API NPS ne répond pas : les alertes seront relues au prochain rafraîchissement.",
    de: 'Die NPS-API antwortet nicht: die Warnungen werden bei der nächsten Aktualisierung neu gelesen.',
    es: 'La API NPS no responde: las alertas se leerán de nuevo en la próxima actualización.',
  },
};

// Feature names, frozen when the device is created (configured language).
export const NAMES = {
  en: {
    closure_alerts: 'Closure alerts',
    danger_alerts: 'Danger alerts',
    caution_alerts: 'Caution alerts',
    information_alerts: 'Information alerts',
    closure: 'Closure in progress',
    alert_level: 'Alert level',
    top_alert: 'Most serious alert',
    next_event: 'Next event',
  },
  fr: {
    closure_alerts: 'Alertes fermeture',
    danger_alerts: 'Alertes danger',
    caution_alerts: 'Alertes prudence',
    information_alerts: 'Alertes information',
    closure: 'Fermeture en cours',
    alert_level: "Niveau d'alerte",
    top_alert: 'Alerte la plus grave',
    next_event: 'Prochain événement',
  },
  de: {
    closure_alerts: 'Schließungswarnungen',
    danger_alerts: 'Gefahrenwarnungen',
    caution_alerts: 'Vorsichtswarnungen',
    information_alerts: 'Informationsmeldungen',
    closure: 'Schließung aktiv',
    alert_level: 'Warnstufe',
    top_alert: 'Schwerste Warnung',
    next_event: 'Nächste Veranstaltung',
  },
  es: {
    closure_alerts: 'Alertas de cierre',
    danger_alerts: 'Alertas de peligro',
    caution_alerts: 'Alertas de precaución',
    information_alerts: 'Alertas de información',
    closure: 'Cierre en curso',
    alert_level: 'Nivel de alerta',
    top_alert: 'Alerta más grave',
    next_event: 'Próximo evento',
  },
};

const plural = (count, one, many) => (count === 1 ? one : many);
const pluralFr = (count, one, many) => (count > 1 ? many : one);

// Category names, texts of the features, the widget and the scene action.
export const TEXT = {
  en: {
    category_closure: 'Closure',
    category_danger: 'Danger',
    category_caution: 'Caution',
    category_information: 'Information',
    alert: ({ category, title }) => `${category}: ${title}`,
    noAlert: 'No alert',
    noEvent: 'No event planned',
    event: ({ when, title }) => `${when} · ${title}`,
    alerts: ({ count }) => `${count} ${plural(count, 'alert', 'alerts')}`,
    parkLine: ({ name, count }) => `${name}: ${count}`,
    sentence: ({ name, count, list }) =>
      count === 0
        ? `${name}: no alert.`
        : `${name}: ${count} ${plural(count, 'alert', 'alerts')}. ${list}.`,
    stale: 'data out of date',
    waiting: 'Waiting for the first reading of the NPS alerts.',
    pickPark: 'Add a park to Gladys in the Discover tab of the integration.',
    gone: 'The chosen parks are no longer in Gladys.',
    noPark: 'No park added to Gladys.',
    allClear: 'No alert in the chosen parks.',
    link: 'NPS alerts',
  },
  fr: {
    category_closure: 'Fermeture',
    category_danger: 'Danger',
    category_caution: 'Prudence',
    category_information: 'Information',
    alert: ({ category, title }) => `${category} : ${title}`,
    noAlert: 'Aucune alerte',
    noEvent: 'Aucun événement prévu',
    event: ({ when, title }) => `${when} · ${title}`,
    alerts: ({ count }) => `${count} ${pluralFr(count, 'alerte', 'alertes')}`,
    parkLine: ({ name, count }) => `${name} : ${count}`,
    sentence: ({ name, count, list }) =>
      count === 0
        ? `${name} : aucune alerte.`
        : `${name} : ${count} ${pluralFr(count, 'alerte', 'alertes')}. ${list}.`,
    stale: 'données périmées',
    waiting: 'En attente de la première lecture des alertes NPS.',
    pickPark: "Ajoutez un parc à Gladys dans l'onglet Découverte de l'intégration.",
    gone: 'Les parcs choisis ne sont plus dans Gladys.',
    noPark: 'Aucun parc ajouté à Gladys.',
    allClear: 'Aucune alerte dans les parcs choisis.',
    link: 'Alertes NPS',
  },
  de: {
    category_closure: 'Schließung',
    category_danger: 'Gefahr',
    category_caution: 'Vorsicht',
    category_information: 'Information',
    alert: ({ category, title }) => `${category}: ${title}`,
    noAlert: 'Keine Warnung',
    noEvent: 'Keine Veranstaltung geplant',
    event: ({ when, title }) => `${when} · ${title}`,
    alerts: ({ count }) => `${count} ${plural(count, 'Warnung', 'Warnungen')}`,
    parkLine: ({ name, count }) => `${name}: ${count}`,
    sentence: ({ name, count, list }) =>
      count === 0
        ? `${name}: keine Warnung.`
        : `${name}: ${count} ${plural(count, 'Warnung', 'Warnungen')}. ${list}.`,
    stale: 'Daten veraltet',
    waiting: 'Warte auf die erste Abfrage der NPS-Warnungen.',
    pickPark: 'Füge im Tab „Entdecken“ der Integration einen Park zu Gladys hinzu.',
    gone: 'Die gewählten Parks sind nicht mehr in Gladys.',
    noPark: 'Kein Park zu Gladys hinzugefügt.',
    allClear: 'Keine Warnung in den gewählten Parks.',
    link: 'NPS-Warnungen',
  },
  es: {
    category_closure: 'Cierre',
    category_danger: 'Peligro',
    category_caution: 'Precaución',
    category_information: 'Información',
    alert: ({ category, title }) => `${category}: ${title}`,
    noAlert: 'Ninguna alerta',
    noEvent: 'Ningún evento previsto',
    event: ({ when, title }) => `${when} · ${title}`,
    alerts: ({ count }) => `${count} ${plural(count, 'alerta', 'alertas')}`,
    parkLine: ({ name, count }) => `${name}: ${count}`,
    sentence: ({ name, count, list }) =>
      count === 0
        ? `${name}: ninguna alerta.`
        : `${name}: ${count} ${plural(count, 'alerta', 'alertas')}. ${list}.`,
    stale: 'datos caducados',
    waiting: 'Esperando la primera lectura de las alertas NPS.',
    pickPark: 'Añada un parque a Gladys en la pestaña Descubrir de la integración.',
    gone: 'Los parques elegidos ya no están en Gladys.',
    noPark: 'Ningún parque añadido a Gladys.',
    allClear: 'Ninguna alerta en los parques elegidos.',
    link: 'Alertas NPS',
  },
};

// The report of the "Status" action of the configuration page.
export const REPORTS = {
  en: {
    noPark: 'No park chosen: choose one or more parks above, then save.',
    demoKey: 'No key typed: DEMO_KEY is used, limited to a few requests an hour. See the guide.',
    invalid: ({ codes }) => `Not park codes, ignored: ${codes}.`,
    unknown: ({ codes }) => `Codes unknown to the NPS: ${codes}.`,
    park: ({ name, code, count }) =>
      `■ ${name} (${code}): ${count} ${plural(count, 'alert', 'alerts')}`,
    read: ({ age }) => `Last reading ${age} min ago.`,
    waiting: 'Not read yet.',
    error: ({ error }) => `Last error: ${error}`,
    watched: ({ count }) => `${count} ${plural(count, 'park', 'parks')} added to Gladys.`,
  },
  fr: {
    noPark: 'Aucun parc choisi : choisissez un ou plusieurs parcs ci-dessus, puis enregistrez.',
    demoKey:
      'Aucune clé saisie : DEMO_KEY est utilisée, limitée à quelques requêtes par heure. Voir le guide.',
    invalid: ({ codes }) => `Codes de parc invalides, ignorés : ${codes}.`,
    unknown: ({ codes }) => `Codes inconnus du NPS : ${codes}.`,
    park: ({ name, code, count }) =>
      `■ ${name} (${code}) : ${count} ${pluralFr(count, 'alerte', 'alertes')}`,
    read: ({ age }) => `Dernière lecture il y a ${age} min.`,
    waiting: 'Pas encore lu.',
    error: ({ error }) => `Dernière erreur : ${error}`,
    watched: ({ count }) => `${count} ${pluralFr(count, 'parc ajouté', 'parcs ajoutés')} à Gladys.`,
  },
  de: {
    noPark: 'Kein Park gewählt: wähle oben einen oder mehrere Parks und speichere.',
    demoKey:
      'Kein Schlüssel eingegeben: DEMO_KEY wird verwendet, auf wenige Anfragen pro Stunde begrenzt. Siehe Anleitung.',
    invalid: ({ codes }) => `Keine Parkcodes, ignoriert: ${codes}.`,
    unknown: ({ codes }) => `Dem NPS unbekannte Codes: ${codes}.`,
    park: ({ name, code, count }) =>
      `■ ${name} (${code}): ${count} ${plural(count, 'Warnung', 'Warnungen')}`,
    read: ({ age }) => `Letzte Abfrage vor ${age} min.`,
    waiting: 'Noch nicht abgefragt.',
    error: ({ error }) => `Letzter Fehler: ${error}`,
    watched: ({ count }) => `${count} ${plural(count, 'Park', 'Parks')} zu Gladys hinzugefügt.`,
  },
  es: {
    noPark: 'Ningún parque elegido: elija uno o varios parques arriba y guarde.',
    demoKey:
      'Ninguna clave introducida: se usa DEMO_KEY, limitada a pocas solicitudes por hora. Vea la guía.',
    invalid: ({ codes }) => `Códigos de parque no válidos, ignorados: ${codes}.`,
    unknown: ({ codes }) => `Códigos desconocidos para el NPS: ${codes}.`,
    park: ({ name, code, count }) =>
      `■ ${name} (${code}): ${count} ${plural(count, 'alerta', 'alertas')}`,
    read: ({ age }) => `Última lectura hace ${age} min.`,
    waiting: 'Aún no leído.',
    error: ({ error }) => `Último error: ${error}`,
    watched: ({ count }) =>
      `${count} ${plural(count, 'parque añadido', 'parques añadidos')} a Gladys.`,
  },
};

/** One text of a table, in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** The same text in every language of the table: `{ en, fr, de, es }`. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** Joins rendered messages (or plain strings), language by language, one per line. */
export function lines(...messages) {
  const languages = Object.keys(messages.find((m) => typeof m === 'object' && m) ?? { en: '' });
  return Object.fromEntries(
    languages.map((language) => [
      language,
      messages
        .filter((message) => message !== null && message !== undefined)
        .map((message) => (typeof message === 'string' ? message : message[language]))
        .join('\n'),
    ]),
  );
}
