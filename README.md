# Installation
## Vorraussetzungen

- docker
- aktueller Benutzer darf Docker ausführen

## Umgebungsvariablen konfigurieren

- `.env` im Projektordner anlegen
- sicheren Wert für `SESSION_SECRET` setzen (mindestens 32 Zeichen)
- Beispiel:

```env
SESSION_SECRET=dein-sehr-langes-zufaelliges-secret-mit-mindestens-32-zeichen
```

## Image Bauen

- In das Projektverzeichnis wechseln
- ```docker build -t lernhilfe .```

## Container Starten

```docker run -p 8080:80 lernhilfe```

## Im Browser öffnen
```http:localhost:8080```

# Anmeldung

Bereits ein Benutzer Angelegt:

```username: User```
```password: user```
