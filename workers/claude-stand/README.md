# claude-stand

Server für die nicht verlinkte App `/c-r8kq2wv5zn/` („Stand“): zeigt auf dem Handy, wie viel vom 5-Stunden- und Wochenlimit von Claude verbraucht ist, wann es zurückgesetzt wird, wohin es ging (Projekte, Sitzungen, Verlauf der letzten 35 Tage), ein Ausgabenlimit (falls vorhanden) und schickt auf Wunsch eine Push-Mitteilung, wenn ein volles Limit wieder frei ist.

## Woher die Daten kommen

Es gibt keine offizielle API für die Abo-Limits. Claude Code gibt seiner Statuszeile aber bei jeder Antwort ein JSON mit `rate_limits` (`five_hour`, `seven_day`, `spend_limit`), Modell, Kosten und Kontext. Ein Statuszeilen-Skript schickt davon eine schlanke Auswahl an `POST /push`. Zu jeder Messung und Sitzung werden Modell-ID, Tokens (in/out), Prompt-Cache (Trefferquote, Warm-Status, Ablauf), Fast Mode, Thinking und die Sitzungs-ID mitgeschickt; Sitzungsnamen werden nicht übertragen oder gespeichert. Kein Anmeldetoken von Claude verlässt den Rechner. Folge: Der Stand ist so frisch wie die letzte Antwort in Claude Code; Nutzung in claude.ai zählt zu denselben Limits, taucht aber erst mit der nächsten Messung auf.

- `POST /push` speichert die Sitzung und eine Messung, wenn sich ein Wert geändert hat oder 10 Minuten vergangen sind. Zu jeder Messung gehören die bisherigen Kosten der meldenden Sitzung (`cost`), daraus rechnet die Seite den API-Wert pro Prozent. Älter als 35 Tage wird gelöscht.
- `GET /state` liefert Messungen und Sitzungen der letzten 35 Tage, ohne Sitzungsnamen. Mit `?since=<ms>` nur, was danach dazukam; die Seite lädt einmal alles und danach jede Minute nur noch das Neue.
- `GET /key`, `PUT /sub`, `DELETE /sub`, `POST /test`: Push-Abos wie in tonne-push (höchstens 10 Geräte). `PUT /sub` nimmt je Gerät die Wahl `reset`, `warn`, `knapp` (true/false); fehlt ein Wert, bleibt der gespeicherte (neu: nur `reset` an), die Antwort enthält alle drei.
- Cron jede Minute über die letzten 30 Messungen, jede Meldung genau einmal pro Fenster (`sent`):
  - `reset`: ein 5-Stunden- oder Wochenfenster ist in der letzten Stunde abgelaufen und hatte mindestens 90 % erreicht.
  - `warn`: das laufende Fenster hat 90 % erreicht.
  - `knapp` (nur zur Viertelstunde): Im Tempo der letzten 24 Stunden wäre die Woche mehr als 30 Minuten vor dem Reset voll.
  - Die Mitteilung trägt `badge` (5-Stunden-Prozent, 0 beim Reset); der Service Worker setzt damit das App-Symbol.
- Web Push und Abo-Prüfung kommen aus `workers/tonne-push/src/push.js` und `common.js`.
- Alle Routen sind ohne Code offen (Wunsch des Betreibers). Wer die Adresse kennt (das Repo ist öffentlich), sieht Prozente, Modelle und Projektnamen und könnte Messungen einschicken; Sitzungsnamen werden weder übertragen noch angezeigt. Schutz nur durch Ratenlimit (60 pro Minute und IP) und Prüfung der Felder.

## Einmalig einrichten

1. Workflow `.github/workflows/claude-stand.yml` starten (läuft auch bei jeder Änderung am Worker und an den geteilten tonne-push-Dateien). Er legt die D1-Datenbank an, wendet die Migrationen an, deployt und erzeugt beim ersten Lauf eigene VAPID-Schlüssel. `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` gibt es schon für tonne-push.
2. Das Skript `.claude/stand-statusline.sh` ist im Repo als `statusLine` in `.claude/settings.json` eingetragen und läuft in jeder Claude-Code-Sitzung in diesem Repo. Es braucht `jq` und `curl`.
   - Cloud-Sitzungen (claude.ai/code) rufen die Statuszeile nicht auf (getestet im Oktober 2026), von dort kommt also nichts an.
   - Am Rechner: Claude Code im Ordner des Repos starten und dem Ordner vertrauen.
   - Für alle Ordner: Skript nach `~/.claude/` kopieren und als `statusLine` in `~/.claude/settings.json` eintragen. Unter Windows `.claude/stand-statusline.ps1` (PowerShell, ohne jq) mit `powershell -NoProfile -ExecutionPolicy Bypass -File <Pfad>`.
   Ob es lief, steht in `$TMPDIR/claude-stand-last.json` (letzte Limits) und `$TMPDIR/claude-stand-status` (HTTP-Code der letzten Übertragung).
3. `https://spanani.de/c-r8kq2wv5zn/` auf dem Handy öffnen und zum Home-Bildschirm hinzufügen. Für Mitteilungen dort „Mitteilungen einschalten“ (auf dem iPhone nur aus der Home-Bildschirm-App).

Prüfen: `node c-r8kq2wv5zn/logik.js` (Rechnungen der Seite) und `node workers/claude-stand/test.mjs` (wann der Cron meldet).

## Wie die Seite rechnet (`c-r8kq2wv5zn/logik.js`)

- Mehrere offene Sitzungen melden jeweils ihren letzten bekannten Stand, also auch ältere, niedrigere Werte. Innerhalb eines Fensters steigt der Verbrauch nur, darum zählt immer das laufende Maximum.
- Jeder Anstieg gehört der Sitzung, die ihn gemeldet hat. Liegen mehr als 15 Minuten zwischen zwei Messungen, ist der Anstieg „nicht gemessen“ (claude.ai, andere Geräte, Cloud) und wird keinem Projekt und keinem Tag zugeschlagen; im Diagramm ist die Strecke gestrichelt.
- Tempo: 5 Stunden über die letzte Stunde, Woche über die letzten 24 Stunden. „Gleichmäßiges Tempo“ ist die Gerade von 0 % am Fensterbeginn zu 100 % am Reset.
- Letzte Woche: das vorige Wochenfenster, um 7 Tage verschoben, als blasse Linie im Wochendiagramm.
- Wert: Kosten aller Claude-Code-Sitzungen seit der ersten Messung mit Kosten (oder seit Wochenbeginn) geteilt durch die gemessenen Wochen-Prozente in derselben Zeit; ab 2 % angezeigt. Der Abo-Vergleich rechnet den API-Wert der letzten 30 Tage (oder weniger, hochgerechnet) gegen den Monatspreis, den der Betreiber einmal wählt (`localStorage` `stand-abo`).
- Rhythmus: gemessene 5-Stunden-Anstiege nach Wochentag und Stunde (35 Tage); darunter die Sitzungen der letzten 24 Stunden mit ihren Ablesungen.

## Gestaltung („Zählerstand“)

Eigene Tokens im `<style>` von `/c-r8kq2wv5zn/index.html`, unabhängig von `design-system.css`:

- Gehäuse `#dcdedb` / `#2a2f32` als Seitenhintergrund, Deckel `#e9eae7` / `#33393c` nur für das Zählerfeld.
- Schild `#1f2326` / `#e4e5e1` für Text und Balken, Beschriftung `#4e5458` / `#a3a8a6` für sekundären Text.
- Linie `#b9bcb8` / `#4a5054` für 1px-Linien, leere Balkenspuren und den Gehäuserand.
- Zählwerk `#151718` für Ziffernfenster und Scheibenschlitz in beiden Farbmodi, Ziffer `#f2f2ee` für Ziffern und Teilstriche.
- Rot `#c40d1e` / `#e0343f` für die letzte Walze, die Scheibenmarke, Warnpunkte und Füllungen ab 90 %, nie als Textfarbe.
- Schrift Archivo: Text 400/600, Walzenziffern 700 bei `font-stretch: 62%` mit Tabellenziffern.
- Walzen: zwei Zählwerke nebeneinander (5 Stunden / Woche) mit je drei Fenstern; Einerwalze rot unterlegt, führende Nullen gedimmt.
- Schreiber: Liniendiagramme wie ein Messschreiber, als Inline-SVG ohne Bibliothek. Gemessen durchgezogen in Schild (2px, Stufen), nicht gemessen gepunktet, Prognose grau gestrichelt, Bereich 90 bis 100 % als blasse rote Zone, roter Punkt dort, wo die Prognose 100 % erreicht. Woche zusätzlich mit gepunkteter Gerade „gleichmäßig“ und Tagesbalken darunter auf derselben Zeitachse. Verlauf: jedes 5-Stunden-Fenster als Balken (Breite = Dauer, Höhe = Spitze, rot ab 90 %), Wochen als Bänder.
- Tooltip: dunkles Zählwerkfeld mit Zifferfarbe, folgt Maus oder Finger mit Fadenkreuz; Tippen außerhalb schließt.
- Rhythmus-Raster: eine Tinte (Schild) in vier Deckkraftstufen, leere Felder in Linie; Legende „wenig … viel“. Zeitleiste: Sitzung als Linie in Linie-Farbe, Ablesungen als Striche in Schild, 5-Stunden-Fenster als Bänder mit 2px Abstand.
- Reihenfolge am Handy: Zähler, laufende Sitzungen, Woche, Wert, Projekte, Rhythmus, Sitzungen, Verlauf, Mitteilungen. Ab 960px bleibt der Zähler links stehen. Solange eine Sitzung läuft, lädt die Seite alle 15 Sekunden neu, sonst jede Minute.
- Bewegung: nur die Walzen rollen beim ersten Laden von 0 auf ihren Wert; Countdowns zählen sekundengenau. `prefers-reduced-motion` schaltet das Rollen ab.
- Kein Link von spanani.de, `noindex`, nicht in der Sitemap.
