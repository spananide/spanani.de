# claude-stand

Server für die nicht verlinkte App `/c-r8kq2wv5zn/` („Stand“): zeigt auf dem Handy, wie viel vom 5-Stunden- und Wochenlimit von Claude verbraucht ist, wann es zurückgesetzt wird, ein Ausgabenlimit (falls vorhanden) und die Claude-Code-Sitzungen der letzten 7 Tage.

## Woher die Daten kommen

Es gibt keine offizielle API für die Abo-Limits. Claude Code gibt seiner Statuszeile aber bei jeder Antwort ein JSON mit `rate_limits` (`five_hour`, `seven_day`, `spend_limit`), Modell, Kosten und Kontext. Ein Statuszeilen-Skript schickt davon eine schlanke Auswahl an `POST /push`. Zu jeder Messung und Sitzung werden Modell-ID, Tokens (in/out), Prompt-Cache (Trefferquote, Warm-Status, Ablauf), Fast Mode, Thinking und die Sitzungs-ID mitgeschickt; Sitzungsnamen werden nicht übertragen oder gespeichert. Kein Anmeldetoken von Claude verlässt den Rechner. Folge: Der Stand ist so frisch wie die letzte Antwort in Claude Code; Nutzung in claude.ai zählt zu denselben Limits, taucht aber erst mit der nächsten Messung auf.

- `POST /push` speichert die Sitzung und eine Messung, wenn sich ein Wert geändert hat oder 10 Minuten vergangen sind. Älter als 35 Tage wird gelöscht.
- `GET /state` liefert Messungen und Sitzungen der letzten 8 Tage, ohne Sitzungsnamen.
- Beide sind ohne Code offen (Wunsch des Betreibers). Wer die Adresse kennt (das Repo ist öffentlich), sieht Prozente, Modelle und Projektnamen und könnte Messungen einschicken; Sitzungsnamen werden weder übertragen noch angezeigt. Schutz nur durch Ratenlimit (60 pro Minute und IP) und Prüfung der Felder.

## Einmalig einrichten

1. Workflow `.github/workflows/claude-stand.yml` starten (läuft auch bei jeder Änderung am Worker). Er legt die D1-Datenbank an und deployt. `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` gibt es schon für tonne-push.
2. Das Skript `.claude/stand-statusline.sh` ist im Repo als `statusLine` in `.claude/settings.json` eingetragen und läuft in jeder Claude-Code-Sitzung in diesem Repo. Es braucht `jq` und `curl`.
   - Cloud-Sitzungen (claude.ai/code) rufen die Statuszeile nicht auf (getestet im Oktober 2026), von dort kommt also nichts an.
   - Am Rechner: Claude Code im Ordner des Repos starten und dem Ordner vertrauen.
   - Für alle Ordner: Skript nach `~/.claude/` kopieren und als `statusLine` in `~/.claude/settings.json` eintragen. Unter Windows `.claude/stand-statusline.ps1` (PowerShell, ohne jq) mit `powershell -NoProfile -ExecutionPolicy Bypass -File <Pfad>`.
   Ob es lief, steht in `$TMPDIR/claude-stand-last.json` (letzte Limits) und `$TMPDIR/claude-stand-status` (HTTP-Code der letzten Übertragung).
3. `https://spanani.de/c-r8kq2wv5zn/` auf dem Handy öffnen und zum Home-Bildschirm hinzufügen.

## Gestaltung („Zählerstand“)

Eigene Tokens im `<style>` von `/c-r8kq2wv5zn/index.html`, unabhängig von `design-system.css`:

- Gehäuse `#dcdedb` / `#2a2f32` als Seitenhintergrund, Deckel `#e9eae7` / `#33393c` nur für das Zählerfeld.
- Schild `#1f2326` / `#e4e5e1` für Text und Balken, Beschriftung `#4e5458` / `#a3a8a6` für sekundären Text.
- Linie `#b9bcb8` / `#4a5054` für 1px-Linien, leere Balkenspuren und den Gehäuserand.
- Zählwerk `#151718` für Ziffernfenster und Scheibenschlitz in beiden Farbmodi, Ziffer `#f2f2ee` für Ziffern und Teilstriche.
- Rot `#c40d1e` / `#e0343f` für die letzte Walze, die Scheibenmarke, Warnpunkte und Füllungen ab 90 %, nie als Textfarbe.
- Schrift Archivo: Text 400/600, Walzenziffern 700 bei `font-stretch: 62%` mit Tabellenziffern.
- Walzen: zwei Zählwerke nebeneinander (5 Stunden / Woche) mit je drei Fenstern; Einerwalze rot unterlegt, führende Nullen gedimmt.
- Scheibe: Ferraris-Scheibe im Zählwerkschlitz dreht sich proportional zum Verbrauchstempo, steht bei Ruhe.
- Prognose: Klartextsatz statt Tempostrich, darunter Tagesablesungen und die Verbraucher der Woche.
- Bewegung: Walzen rollen beim ersten Laden von 0 auf ihren Wert, Scheibe dreht im Takt des Verbrauchs. `prefers-reduced-motion` schaltet Rollen und Scheibenanimation ab.
- Kein Link von spanani.de, `noindex`, nicht in der Sitemap.
