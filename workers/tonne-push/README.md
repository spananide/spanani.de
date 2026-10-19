# tonne-push

Server für zwei nicht verlinkte Apps:

- `/t-7yhbbwj4/` Abfuhr-Erinnerungen (Bezirk 2, Hürth), Routen `/key`, `/sub`, `/test`.
- `/f-jft9sz2y13/` Familien-App „Zuhause“, Routen unter `/f/` (`src/familie.js`, Tabellen in `migrations/0002_familie.sql`).
Die Termine liegen in `/t-7yhbbwj4/termine.json` und werden beim Deploy in den Worker gebündelt.
Ein Cron läuft alle 15 Minuten und schickt fällige Erinnerungen per Web Push (VAPID, aes128gcm).

## Einmalig einrichten

Am einfachsten über GitHub Actions (`.github/workflows/tonne-push.yml`): In den Repository-Secrets `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“ plus D1: Edit) und `CLOUDFLARE_ACCOUNT_ID` hinterlegen, dann den Workflow starten. Er legt Datenbank und VAPID-Schlüssel beim ersten Lauf selbst an und deployt danach bei jeder Änderung an Worker oder Terminen.

Von Hand:

```sh
cd workers/tonne-push
npx wrangler d1 create tonne-push-db        # database_id in wrangler.jsonc eintragen
npx wrangler d1 migrations apply tonne-push-db --remote
node keys.mjs                                # erzeugt VAPID_PUBLIC und VAPID_PRIVATE
npx wrangler secret put VAPID_PUBLIC
npx wrangler secret put VAPID_PRIVATE
npx wrangler deploy
```

Die Schlüssel nie neu erzeugen, sonst müssen alle Geräte die Erinnerung neu einschalten.

## Neues Jahr

1. Neues PDF (`https://www.swhmobil.de/fileadmin/pdf/muellkalender/<Jahr>/Bezirk_02_<Jahr>.pdf`) auslesen und die Termine in `termine.json` eintragen, `quelle` und `bis` anpassen.
2. `npx wrangler deploy`, damit der Cron die neuen Termine kennt.

## Gestaltung („Bordstein“)

Eigene Tokens im `<style>` von `/t-7yhbbwj4/index.html`, unabhängig von `design-system.css`:

- Beton `#dcdfdd` / Asphalt `#1f2326` als Grund, Teer `#1b1e20` / `#e6e8e6` als Text.
- Kommunalorange `#ec7c26` nur für den einen Hauptknopf und die Markierung „Heute“/„Morgen“.
- Deckelfarben (Hausmüll, Bio, Papier, Gelb) nur zur Kennzeichnung, nie als Textfläche. Sonderabholungen (Grünabfälle, Tannenbaum, Schadstoffmobil) bekommen einen leeren Strich.
- Schrift Barlow (Text) und Barlow Condensed 700 (Daten), selbst gehostet in `fonts/`.
- Der Bordstein ist die einzige laute Linie, auf ihm stehen Tonnen und Sack. Rest: Liste mit 1px-Linien zwischen echten Terminen.
- Nur das Einstellungsblatt schwebt (Radius 18px oben, Schatten). Knöpfe und Felder 8px.
- Bewegung: einmal rollen die Tonnen an den Bordstein, sonst nur Antworten (Blatt, Schalter, „Gesendet“). `prefers-reduced-motion` schaltet alles ab.
- Kein Link von spanani.de, `noindex`, nicht in der Sitemap.

## Familien-App „Zuhause“

- Zugang: Wer zuerst „Familie anlegen“ ausführt, wird Verwalter (`members.admin`). Danach nur per Einladungscode (`settings.invite`, vom Verwalter erneuerbar) oder per Gerätecode (15 Minuten, einmalig) für ein weiteres Gerät derselben Person.
- Nur der Verwalter darf Mitglieder bearbeiten oder entfernen und die Einladung erneuern. Alles andere dürfen alle.
- Geräte melden sich mit einem Bearer-Token an, gespeichert wird nur der SHA-256-Hash.
- Sync: `GET /f/state?since=<ms>` liefert alles, was sich seitdem geändert hat (mit Löschmarkierungen). Die App fragt alle 8 Sekunden, solange sie offen ist.
- Aufgaben-Regeln: `woche` (Wochentage, 0 = Sonntag), `tage` (alle n Tage), `tonnen` (Abend vor jeder Abholung von Hausmüll, Bio, Altpapier oder Gelbem Sack), `einmal`. `reihum` wechselt die Person bei „Erledigt“, „Rückgängig“ stellt den letzten Stand wieder her.
- Termin-Erinnerung `remind` = Minuten vor Beginn (ganztägig: Beginn 00:00, also 360 = Vortag 18 Uhr, -480 = am Tag 8 Uhr).
- Der Cron schickt Aufgaben-, Termin- und Müll-Mitteilungen, `sent` verhindert doppelte. Um 3 Uhr räumt er Löschmarkierungen (30 Tage), abgelaufene Notizen und erledigte Einmal-Aufgaben (7 Tage) auf.
- Gestaltung wie „Bordstein“ oben, dazu Personenfarben `--p-rot` … `--p-sand` (hell und dunkel getrennt), nur als Punkt neben Namen. Auf breiten Bildschirmen steht „Heute“ links fest.
