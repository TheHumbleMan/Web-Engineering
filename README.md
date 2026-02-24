# Installation
## Vorraussetzungen

- Node.js (node -v)
- npm (npm -v)

## Abhängigkeiten installieren

- npm install

## Umgebungsvariablen konfigurieren

- `.env` im Projektordner anlegen
- sicheren Wert für `SESSION_SECRET` setzen (mindestens 32 Zeichen)
- Beispiel:

```env
SESSION_SECRET=dein-sehr-langes-zufaelliges-secret-mit-mindestens-32-zeichen
```

## Anwendung starten

- node app.js (aktuell eine Übergangslösung bis richtiges Backend existiert)

## Im Browser öffnen
```http:localhost:3000/auth/login```
oder je nach nginx Verknüfpung auch mit URL
### Aktuell in der entwicklung noch:
```http:localhost:3000/auth/login```
```http:localhost:3000/subjects```
```http:localhost:3000/subjectc```

# Anmeldung

Bereits ein Benutzer Angelegt:

prename: Max
lastname: Mustermann
```username: User```
```password: user```
