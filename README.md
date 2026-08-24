# Agenda Personale — aggiornamento promemoria

Modifiche:
- scelta del tipo di promemoria: Notifica oppure Allarme;
- allarme con schermata STOP e suono in loop quando la PWA è aperta;
- notifiche persistenti con `requireInteraction` quando il browser le supporta;
- Service Worker aggiornato e cache versionata;
- logo scelto inserito come icona PWA in `icons/icon-192.png` e `icons/icon-512.png`;
- panoramiche settimanale e mensile mantenute.

Nota Android/Chrome:
una PWA web non può garantire una vera suoneria continua a telefono bloccato/app completamente chiusa. Per quello serve un sistema push con backend oppure un'app Android nativa. Questa versione risolve il bug principale (non veniva mai programmato alcun promemoria) e fornisce il comportamento di allarme quando la PWA è attiva.
