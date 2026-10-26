# claude-stand

Server für die nicht verlinkte App `/c-r8kq2wv5zn/` („Stand“): zeigt auf dem Handy, wie viel vom 5-Stunden- und Wochenlimit von Claude verbraucht ist, wann es zurückgesetzt wird, wohin es ging (Unterhaltungen mit ihrem Chat-Namen, Verlauf der letzten 35 Tage), ein Ausgabenlimit (falls vorhanden) und schickt auf Wunsch eine Push-Mitteilung, wenn ein volles Limit wieder frei ist.

## Woher die Daten kommen

Es gibt keine offizielle API für die Abo-Limits. Claude Code gibt seiner Statuszeile aber bei jeder Antwort ein JSON mit `rate_limits` (`five_hour`, `seven_day`, `spend_limit`), Modell, Kosten und Kontext. Ein Statuszeilen-Skript schickt davon eine schlanke Auswahl an `POST /push`. Zu jeder Messung und Sitzung werden Modell-ID, Tokens (Summe der Unterhaltung, gesendet/empfangen), Prompt-Cache (Trefferquote, Warm-Status, Ablauf), Fast Mode, Thinking, die Sitzungs-ID und der Chat-Name (`session_name`) mitgeschickt. Kein Anmeldetoken von Claude verlässt den Rechner. Folge: Der Stand ist so frisch wie die letzte Antwort in Claude Code; Nutzung in claude.ai zählt zu denselben Limits, taucht aber erst mit der nächsten Messung auf.

- `POST /push` speichert die Sitzung und eine Messung, wenn sich ein Wert geändert hat oder 10 Minuten vergangen sind. Zu jeder Messung gehören die bisherigen Kosten der meldenden Sitzung (`cost`), daraus rechnet die Seite den API-Wert pro Prozent. Älter als 35 Tage wird gelöscht.
- Chat-Namen nur mit Schlüssel: Die Windows-Statuszeile erzeugt einmal einen zufälligen Schlüssel (`~/.claude/stand/key`, 64 Hex-Zeichen) und schickt ihn als Header `X-Stand-Key`. Der erste gültige Schlüssel gewinnt: Der Worker speichert nur seinen SHA-256-Hash (Tabelle `config`). Namen übernimmt `POST /push` nur mit passendem Schlüssel, `GET /state` liefert die Spalte `name` nur mit passendem Schlüssel. Neuer Schlüssel: Zeile in `config` löschen, Datei `key` löschen.
- `GET /state` liefert Messungen und Sitzungen der letzten 35 Tage, Chat-Namen nur mit Schlüssel. Mit `?since=<ms>` nur, was danach dazukam; die Seite lädt einmal alles und danach jede Minute nur noch das Neue.
- `GET /key`, `PUT /sub`, `DELETE /sub`, `POST /test`: Push-Abos wie in tonne-push (höchstens 10 Geräte). `PUT /sub` nimmt je Gerät die Wahl `reset`, `warn`, `knapp` (true/false); fehlt ein Wert, bleibt der gespeicherte (neu: nur `reset` an), die Antwort enthält alle drei.
- Cron jede Minute über die letzten 30 Messungen, jede Meldung genau einmal pro Fenster (`sent`):
  - `reset`: ein 5-Stunden- oder Wochenfenster ist in der letzten Stunde abgelaufen und hatte mindestens 90 % erreicht.
  - `warn`: das laufende Fenster hat 90 % erreicht.
  - `knapp` (nur zur Viertelstunde): Im Tempo der letzten 24 Stunden wäre die Woche mehr als 30 Minuten vor dem Reset voll.
  - Die Mitteilung trägt `badge` (5-Stunden-Prozent, 0 beim Reset); der Service Worker setzt damit das App-Symbol.
- Web Push und Abo-Prüfung kommen aus `workers/tonne-push/src/push.js` und `common.js`.
- Alle Routen sind ohne Code offen (Wunsch des Betreibers). Wer die Adresse kennt (das Repo ist öffentlich), sieht Prozente, Modelle und Ordnernamen und könnte Messungen einschicken, aber keine Chat-Namen (siehe Schlüssel). Schutz nur durch Ratenlimit (60 pro Minute und IP) und Prüfung der Felder.

## Einmalig einrichten

1. Workflow `.github/workflows/claude-stand.yml` starten (läuft auch bei jeder Änderung am Worker und an den geteilten tonne-push-Dateien). Er legt die D1-Datenbank an, wendet die Migrationen an, deployt und erzeugt beim ersten Lauf eigene VAPID-Schlüssel. `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` gibt es schon für tonne-push.
2. Das Skript `.claude/stand-statusline.sh` ist im Repo als `statusLine` in `.claude/settings.json` eingetragen und läuft in jeder Claude-Code-Sitzung in diesem Repo. Es braucht `jq` und `curl`.
   - Cloud-Sitzungen (claude.ai/code) rufen die Statuszeile nicht auf (getestet im Oktober 2026), von dort kommt also nichts an.
   - Am Rechner: Claude Code im Ordner des Repos starten und dem Ordner vertrauen.
   - Für alle Ordner: Skript nach `~/.claude/` kopieren und als `statusLine` in `~/.claude/settings.json` eintragen. Unter Windows `.claude/stand-statusline.ps1` (PowerShell, ohne jq) mit `powershell -NoProfile -ExecutionPolicy Bypass -File <Pfad>`.
   Ob es lief, steht in `$TMPDIR/claude-stand-last.json` (letzte Limits) und `$TMPDIR/claude-stand-status` (HTTP-Code der letzten Übertragung). Die Windows-Statuszeile schickt im Hintergrund mit dem `curl.exe` von Windows und wartet nicht darauf.
3. `https://spanani.de/c-r8kq2wv5zn/` auf dem Handy öffnen und zum Home-Bildschirm hinzufügen. Für Mitteilungen dort „Mitteilungen einschalten“ (auf dem iPhone nur aus der Home-Bildschirm-App).
4. Windows-App (optional): `.claude/stand-tray.cs`, `.claude/stand-tray.ps1` und `.claude/stand-tray.ico` neben die Statuszeile nach `~/.claude/` kopieren und einmal `powershell -NoProfile -ExecutionPolicy Bypass -File ~/.claude/stand-tray.ps1 -Install` ausführen. Das kompiliert `stand-tray.exe` mit dem in Windows enthaltenen C#-Compiler (.NET Framework 4.8, nichts zu installieren), trägt sie als „Claude Stand“ in den Autostart (`HKCU\…\Run`, mit `--leise`) und ins Startmenü ein, beendet eine alte Kopie, startet die neue und holt ihr Symbol aus dem Überlauf auf die Taskleiste. Nach Änderungen an `stand-tray.cs` dasselbe noch einmal.

Prüfen: `node c-r8kq2wv5zn/logik.js` (Rechnungen der Seite), `node workers/claude-stand/test.mjs` (wann der Cron meldet) und `powershell -File .claude/stand-tray.ps1 -Test` (baut die Exe, prüft ihre Rechnungen mit `stand-tray.exe --test <datei>` und dann Statuszeile und App zusammen).

## Windows: Statuszeile und App im Infobereich

Claude Code gibt der Statuszeile nur den aktuellen Kontext, keine Summen. Darum zählt `stand-statusline.ps1` die `usage`-Zeilen des Transkripts selbst zusammen (jede Antwort einmal, auch wenn sie über mehrere Zeilen geht) und liest dabei nur, was seit dem letzten Lauf dazukam. Ergebnis je Sitzung in `~/.claude/stand/<Sitzungs-ID>.json`: Tokens (gesendet: Eingabe plus Cache, empfangen: Ausgabe), Kosten, die letzten Limits und alles noch einmal je Stunde. Neue Kosten gehen in die Stunden der dabei gelesenen Tokens; nur beim ersten Lauf einer Sitzung reicht das zurück und ist nach Tokenanzahl statt Preis verteilt. Dazu kommt der Chat-Name (`name`). Diese Dateien bleiben auf dem Rechner; an `/push` gehen die Token-Summen und mit Schlüssel der Chat-Name.

Die Statuszeile zeigt zwei Zeilen: diese Unterhaltung (Modell, Kontext, Tokens gesendet/empfangen, Kosten, Dauer, Zeilen +/−, Cache-Trefferquote) und die Limits mit Countdown bis zum Reset, grün unter 70 %, gelb ab 70 %, rot ab 90 %.

`stand-tray.exe` (Quelltext `stand-tray.cs`, C# 5 mit WPF; `stand-tray.ps1` baut, prüft und installiert sie) liest diese Dateien alle 2 Sekunden:

- Symbol im Infobereich: die 5-Stunden-Prozent als Zahl, rot ab 90 %. Klick öffnet den Zähler über der Taskleiste, Klick daneben oder Esc schließt ihn. Ein Doppelklick lässt ihn offen. Rechtsklick: Stand im Browser öffnen, Schlüssel fürs Handy kopieren, Mit Windows starten, Beenden. Ein zweiter Start (Startmenü) öffnet den Zähler der laufenden App.
- Limits wie auf der Seite: neuestes Fenster, darin der höchste Wert aller Sitzungen; nach dem Reset 0.
- Heute und diese Woche (seit Beginn des Wochenfensters): Summe der Stunden aller Sitzungen dieses Rechners.
- Die Scheibe dreht sich wie beim Stromzähler: einmal in 24 Sekunden bei 1 $ pro Stunde, mit der Wurzel schneller (4 $ doppelt, 16 $ viermal so schnell, höchstens 10-fach). Tempo über die letzten 5 Minuten, jede Sitzung ab ihrem ersten Auftauchen; ohne Meldung seit 2 Minuten steht sie.
- Zähler: nur die beiden Walzen mit Reset, die Scheibe, eine Tempo-Zeile und darunter der Chat-Name der laufenden Unterhaltung; dann Heute und Diese Woche, dann „Stand öffnen“.
- Gestaltung wie „Zählerstand“ unten (dieselben Farben, hell/dunkel nach der Taskleiste); Schrift Bahnschrift (in Windows enthalten, DIN-Familie) statt Archivo, Walzen in Bold Condensed. Bewegung nur bei Walzen, Scheibe und Öffnen; „Animationen anzeigen“ aus in Windows schaltet sie ab. Die Scheibe steht still, solange der Zähler zu ist.

## Wie die Seite rechnet (`c-r8kq2wv5zn/logik.js`)

- Mehrere offene Sitzungen melden jeweils ihren letzten bekannten Stand, also auch ältere, niedrigere Werte. Innerhalb eines Fensters steigt der Verbrauch nur, darum zählt immer das laufende Maximum.
- Jeder Anstieg gehört der Sitzung, die ihn gemeldet hat. Liegen mehr als 15 Minuten zwischen zwei Messungen, ist der Anstieg „nicht gemessen“ (claude.ai, andere Geräte, Cloud) und wird keinem Projekt und keinem Tag zugeschlagen; im Diagramm ist die Strecke gestrichelt.
- Tempo: 5 Stunden über die letzte Stunde, Woche über die letzten 24 Stunden. „Gleichmäßiges Tempo“ ist die Gerade von 0 % am Fensterbeginn zu 100 % am Reset.
- Wert: Kosten aller Claude-Code-Sitzungen seit der ersten Messung mit Kosten (oder seit Wochenbeginn) geteilt durch die gemessenen Wochen-Prozente in derselben Zeit; ab 2 % angezeigt. Die Seite zeigt davon nur den API-Wert und die Tokens der laufenden Woche und rechnet den API-Wert der letzten 30 Tage (oder weniger, hochgerechnet) gegen Claude Pro (20 $ im Monat, fest).
- Unterhaltungen: je Sitzung Chat-Name (ohne Schlüssel „Unterhaltung“ und die Startzeit), Dauer, API-Wert und Anteil an der Woche. Ordnernamen zeigt die Seite nicht.
- Schneller Start: der letzte Stand liegt in `localStorage` `stand-daten` und wird sofort gezeichnet; neu gezeichnet wird nur, wenn `/state` Neues bringt. Der Schlüssel liegt in `stand-key`.

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
- Weniger ist mehr: eine Spalte (höchstens 560px) auf Handy und Desktop. Reihenfolge: Zähler mit 5-Stunden-Diagramm und einem Satz, Woche (Diagramm ohne Legende, Tagesbalken), Wert (zwei Zeilen), Unterhaltungen (drei sichtbar, der Rest zugeklappt), Verlauf (zugeklappt, wird erst beim Aufklappen gezeichnet), Mitteilungen, Fuß mit „Chat-Namen anzeigen“. Solange eine Sitzung läuft, lädt die Seite alle 15 Sekunden neu, sonst jede Minute.
- Bewegung: nur die Walzen rollen beim ersten Laden von 0 auf ihren Wert; Countdowns zählen sekundengenau. `prefers-reduced-motion` schaltet das Rollen ab.
- Kein Link von spanani.de, `noindex`, nicht in der Sitemap.
