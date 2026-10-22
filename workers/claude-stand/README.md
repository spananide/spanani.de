# claude-stand

Server für die nicht verlinkte App `/c-r8kq2wv5zn/` („Stand“): zeigt auf dem Handy, wie viel vom 5-Stunden- und Wochenlimit von Claude verbraucht ist, wann es zurückgesetzt wird, ein Ausgabenlimit (falls vorhanden) und die Claude-Code-Sitzungen der letzten 7 Tage.

## Woher die Daten kommen

Es gibt keine offizielle API für die Abo-Limits. Claude Code gibt seiner Statuszeile aber bei jeder Antwort ein JSON mit `rate_limits` (`five_hour`, `seven_day`, `spend_limit`), Modell, Kosten und Kontext. Ein Statuszeilen-Skript schickt davon eine schlanke Auswahl an `POST /push`. Kein Anmeldetoken von Claude verlässt den Rechner. Folge: Der Stand ist so frisch wie die letzte Antwort in Claude Code; Nutzung in claude.ai zählt zu denselben Limits, taucht aber erst mit der nächsten Messung auf.

- `POST /push` speichert die Sitzung und eine Messung, wenn sich ein Wert geändert hat oder 10 Minuten vergangen sind. Älter als 35 Tage wird gelöscht.
- `GET /state` liefert Messungen und Sitzungen der letzten 8 Tage.
- Beide sind ohne Code offen (Wunsch des Betreibers). Wer die Adresse kennt, sieht Prozente, Modelle und Projektnamen und könnte Messungen einschicken. Schutz nur durch Ratenlimit (60 pro Minute und IP) und Prüfung der Felder.

## Einmalig einrichten

1. Workflow `.github/workflows/claude-stand.yml` starten (läuft auch bei jeder Änderung am Worker). Er legt die D1-Datenbank an und deployt. `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` gibt es schon für tonne-push.
2. Das Skript `.claude/stand-statusline.sh` ist im Repo als `statusLine` in `.claude/settings.json` eingetragen und läuft in jeder Claude-Code-Sitzung in diesem Repo. Es braucht `jq` und `curl`.
   - Cloud-Sitzungen (claude.ai/code): `claude-stand.spanani.workers.dev` unter Network access → Allowed domains erlauben. Gilt ab der nächsten neuen Sitzung.
   - Am Rechner: Claude Code im Ordner des Repos starten und dem Ordner vertrauen.
   Ob es lief, steht in `$TMPDIR/claude-stand-last.json` (letzte Limits) und `$TMPDIR/claude-stand-status` (HTTP-Code der letzten Übertragung).
3. `https://spanani.de/c-r8kq2wv5zn/` auf dem Handy öffnen und zum Home-Bildschirm hinzufügen.

## Gestaltung („Pace“)

Eigene Tokens im `<style>` von `/c-r8kq2wv5zn/index.html`, unabhängig von `design-system.css`:

- Schiefer `#1d2024` / Kalk `#e9e9e4` als Grund, Kreide `#e8e6df` / Graphit `#1c1e21` für Text und den Füllstand, Fuge `#3a3e44` / `#c3c3bb` für Linien und leere Spur.
- Bernstein `#e0a526` / `#9a6a00` nur für das gleichmäßige Tempo: Strich auf der Spur, gestrichelte Linie im Verlauf, Markierung „schneller als gleichmäßig“.
- Ziegel `#d0533c` / `#b23a24` nur ab 90 % Verbrauch und für Fehler, nie als Textfarbe.
- Schrift Archivo (variabel, selbst gehostet in `fonts/`): Text 400/600, Zahlen 700 bei `font-stretch: 62%` mit Tabellenziffern.
- Das Erkennungszeichen ist die Tempo-Spur: Verbrauch über dem Zeitlineal des Fensters, der Bernsteinstrich zeigt, wo man bei gleichmäßigem Verbrauch stünde. Rest: Zeilen mit 1px-Linien.
- Nichts schwebt, keine Schatten. Knöpfe 6px.
- Bewegung: einmal füllen sich die Spuren und der Tempostrich setzt sich, sonst nur Antworten. `prefers-reduced-motion` schaltet alles ab.
- Kein Link von spanani.de, `noindex`, nicht in der Sitemap.
