# tonne-push

Push-Erinnerungen für die nicht verlinkte Abfuhr-App unter `/t-7yhbbwj4/` (Bezirk 2, Hürth).
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
