/**
 * @file app.js
 * @description Express-Backend für die WebApp "Lernhilfe".  
 * Stellt User-Authentifizierung, Subject-Management, Todos, Noten und Timer-Funktionen bereit.
 */

const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const session = require("express-session");
require("dotenv").config();

// =======================
// Konfiguration & Setup
// =======================

const SESSION_SECRET_MIN_LENGTH = 32;
const sessionSecret = process.env.SESSION_SECRET;

// Überprüft, ob das SESSION_SECRET aus der .env gesetzt ist und lang genug ist.
// Falls nicht, wird ein Fehler geworfen, damit die App nicht unsicher startet.
if (typeof sessionSecret !== "string" || sessionSecret.trim().length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(
        `SESSION_SECRET fehlt oder ist zu kurz. Setze ein sicheres Secret in .env (mindestens ${SESSION_SECRET_MIN_LENGTH} Zeichen).`
    );
}

const app = express();

//EJS Template Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//Statische Ressourcen
app.use('/favicon', express.static(path.join(__dirname, 'favicon'), {
    maxAge: '1d',
    immutable: true
}));
app.use(express.urlencoded({ extended: true })); // für POST form data
app.use(express.json());
app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax"
        }
    })
);

app.use((req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
});

app.use((req, res, next) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    const requestToken = req.body?._csrf || req.get("x-csrf-token");
    if (!requestToken || requestToken !== req.session.csrfToken) {
        return res.status(403).send("Invalid CSRF token");
    }

    next();
});

app.use("/assets", express.static(path.join(__dirname, "public/assets")));
app.use("/img", express.static(path.join(__dirname, "img")));

// Pfad zum Datenordner
const DATA_DIR = path.join(__dirname, "data");

// Pfad zur users.json Datei
const USERS_FILE = path.join(DATA_DIR, "users.json");

// Mindestlänge für sichere Passwörter
const PASSWORD_MIN_LENGTH = 8;

// Login Rate-Limit: max. Versuche pro LOGIN_WINDOW_MS
const LOGIN_ATTEMPT_LIMIT = 5;

// Zeitraum für Rate-Limit in Millisekunden (hier 1 Minute)
const LOGIN_WINDOW_MS = 60 * 1000;

// Map zur Speicherung von Login-Versuchen pro IP-Adresse
const loginAttemptsByIp = new Map();

/**
 * Prüft, ob ein Passwort stark genug ist.
 * Kriterien:
 * - Mindestens PASSWORD_MIN_LENGTH Zeichen
 * - Mindestens ein Kleinbuchstabe
 * - Mindestens ein Großbuchstabe
 * - Mindestens eine Zahl
 * - Mindestens ein Sonderzeichen
 * 
 * @param {string} password - Das zu prüfende Passwort
 * @returns {boolean} true, wenn das Passwort stark ist, sonst false
 */
function isStrongPassword(password) {
    if (typeof password !== "string") return false;
    return (
        password.length >= PASSWORD_MIN_LENGTH &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[\W_]/.test(password)
    );
}

/**
 * Prüft, ob eine IP-Adresse das Login-Limit überschritten hat.
 * 
 * Verwendet eine Map (`loginAttemptsByIp`) zur Speicherung von Login-Versuchen.
 * - Begrenzt die Anzahl der Login-Versuche pro IP innerhalb eines bestimmten Zeitfensters.
 * - Aktualisiert die Liste der Login-Versuche nach jedem Aufruf.
 * 
 * @param {string} ipAddress - Die IP-Adresse des Clients
 * @returns {boolean} true, wenn die IP gesperrt ist (Limit überschritten), sonst false
 */
function isLoginRateLimited(ipAddress) {
    const now = Date.now();
    const attempts = loginAttemptsByIp.get(ipAddress) || [];
    const recentAttempts = attempts.filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);

    if (recentAttempts.length >= LOGIN_ATTEMPT_LIMIT) {
        loginAttemptsByIp.set(ipAddress, recentAttempts);
        return true;
    }

    recentAttempts.push(now);
    loginAttemptsByIp.set(ipAddress, recentAttempts);
    return false;
}

/**
 * Stellt sicher, dass der Datenordner und die users.json existieren.
 * 
 * - Legt das Datenverzeichnis (`DATA_DIR`) an, falls es nicht existiert.
 * - Prüft, ob die `users.json` vorhanden ist.
 *   - Falls nicht, wird eine leere Datei mit einem leeren `users`-Array erstellt.
 * 
 * @async
 * @function
 * @returns {Promise<void>} Keine Rückgabe, erstellt nur Dateien/Ordner falls nötig
 */
async function ensureDataStore() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(USERS_FILE);
    } catch (err) {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
}

/**
 * Lädt die Benutzerliste aus der Datei `users.json`.
 * 
 * - Stellt zuerst sicher, dass das Datenverzeichnis und die Datei existieren (`ensureDataStore`).
 * - Liest die Datei `users.json` ein und parsed den JSON-Inhalt.
 * - Stellt sicher, dass `data.users` ein Array ist.
 * - Bei Fehlern (z. B. Datei beschädigt) wird eine leere Struktur angelegt und zurückgegeben.
 * 
 * @async
 * @function
 * @returns {Promise<{users: Array}>} Objekt mit dem Array aller Benutzer
 */
async function loadUsers() {
    await ensureDataStore();
    try {
        const raw = await fs.readFile(USERS_FILE, "utf8");
        const data = JSON.parse(raw);
        if (!Array.isArray(data.users)) data.users = [];
        return data;
    } catch (err) {
        const fallback = { users: [] };
        await fs.writeFile(USERS_FILE, JSON.stringify(fallback, null, 2));
        return fallback;
    }
}

/**
 * Lädt die persönlichen Daten eines einzelnen Benutzers.
 * 
 * - Liest die JSON-Datei des Benutzers aus dem Ordner `data/userdata/`.
 * - Parsed den Inhalt und gibt ihn als Objekt zurück.
 * 
 * @async
 * @function
 * @param {string} username - Benutzername des Benutzers
 * @returns {Promise<Object>} Das gespeicherte Benutzerobjekt (z. B. subjects, grades)
 * @throws {Error} Wenn die Datei nicht existiert oder JSON ungültig ist
 */
async function loadUserData(username){
    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    const rawData = await fs.readFile(filePath, "utf8");
    return JSON.parse(rawData);
}

/**
 * Speichert die Benutzerliste in der Datei `users.json`.
 * 
 * - Stellt zuerst sicher, dass das Datenverzeichnis existiert (`ensureDataStore`).
 * - Überschreibt die Datei `users.json` mit den übergebenen Daten.
 * 
 * @async
 * @function
 * @param {{users: Array}} data - Objekt mit dem Array aller Benutzer
 * @returns {Promise<void>} Keine Rückgabe
 */
async function saveUsers(data) {
    await ensureDataStore();
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}
/**
 * Speichert die persönlichen Daten eines Benutzers in einer JSON-Datei.
 * 
 * - Überschreibt die Datei `data/userdata/<username>.json` mit den übergebenen Daten.
 * 
 * @async
 * @function
 * @param {string} username - Der Benutzername des Benutzers
 * @param {Object} data - Das zu speichernde Benutzerobjekt (z. B. subjects, grades)
 * @returns {Promise<void>} Keine Rückgabe
 */
async function saveUserData(username, data) {
    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Middleware, die prüft, ob ein Benutzer eingeloggt ist.
 * 
 * - Wird in Routen verwendet, die nur für angemeldete Benutzer zugänglich sind.
 * - Wenn kein Benutzer in der Session vorhanden ist, wird auf die Login-Seite weitergeleitet.
 * - Andernfalls wird `next()` aufgerufen, um die nächste Middleware oder Route auszuführen.
 * 
 * @function
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 * @param {Function} next - Callback, um zur nächsten Middleware/Route zu gelangen
 */
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/auth/login?error=access");
    }
    next();
}

/**
 * GET "/"
 * 
 * Root-URL der App.
 * - Prüft, ob ein Benutzer eingeloggt ist.
 *   - Wenn ja, Weiterleitung auf die Subject-Übersichtsseite.
 *   - Wenn nein, Weiterleitung auf die Login-Seite.
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/subjects");
    }
    return res.redirect("/auth/login");
});

/**
 * GET "/auth/login"
 * 
 * Rendert die Login-Seite mit optionalen Query-Parametern:
 * - `error` für Fehlermeldungen
 * - `success` für Erfolgsmeldungen
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/auth/login", (req, res) => {
    res.render("login", { error: req.query.error, success: req.query.success });
});

/**
 * GET "/auth/register"
 * 
 * Rendert die Registrierungsseite mit optionalen Query-Parametern:
 * - `error` für Fehlermeldungen
 * - `success` für Erfolgsmeldungen
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/auth/register", (req, res) => {
    res.render("register", { error: req.query.error, success: req.query.success });
})

/**
 * GET "/about"
 * 
 * Rendert die About-Seite mit optionalen Query-Parametern:
 * - `error` für Fehlermeldungen
 * - `success` für Erfolgsmeldungen
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/about", (req, res) => {
    res.render("about", { error: req.query.error, success: req.query.success });
})

/**
 * GET "/subjects"
 * 
 * Rendert die Subject-Übersichtsseite für den aktuell eingeloggten Benutzer.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Lädt die Benutzerdaten aus `userdata/<username>.json`.
 * - Übergibt folgende Daten an das EJS-Template:
 *   - `error` / `success` aus Query-Parametern
 *   - `currentUser`: Informationen zum eingeloggten Benutzer
 *   - `subjects`: Array der Fächer des Benutzers
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/subjects", requireLogin, async (req, res) => {
    const userData = await loadUserData(req.session.user.username);
    res.render("subjects", {
        error: req.query.error,
        success: req.query.success,
        currentUser: req.session.user,
        subjects: userData.subjects
    });
})

/**
 * GET "/subjects/:id"
 * 
 * Rendert die Detailseite eines einzelnen Fachs für den aktuell eingeloggten Benutzer.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Prüft, ob der Benutzername in der Session existiert, sonst Weiterleitung zum Login.
 * - Lädt die Benutzerdaten aus `userdata/<username>.json`.
 * - Prüft, ob das Fach mit der angegebenen ID existiert, sonst Weiterleitung zur Übersicht mit Fehler.
 * - Berechnet den Durchschnitt der Noten für dieses Fach, falls vorhanden.
 * - Übergibt folgende Daten an das EJS-Template:
 *   - `currentUser`: eingeloggter Benutzer
 *   - `subject`: das gefundene Fachobjekt
 *   - `average`: Durchschnitt der Noten (Number) oder null
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/subjects/:id", requireLogin, async (req, res)=>{
    const username = req.session.user.username;
    if(!username) {
        return res.redirect("/auth/login")
    };

    const userData = await loadUserData(username);
    const subjectID = req.params.id;
    if(!userData || !userData.subjects) {
        return res.redirect("/subjects?error=Data error")
    };

    const subject = userData.subjects.find(s => s.id === subjectID);
    if(!subject){
        return res.redirect("/subjects?error=Subject not found");
    }

    // Compute average grade for this subject from user's grades (if any)
    const grades = userData.grades || [];
    const gradesForSubject = grades.filter(g => g.subject === subject.name).map(g => Number(g.grade)).filter(g => Number.isFinite(g));
    const average = gradesForSubject.length ? (gradesForSubject.reduce((a,b)=>a+b,0) / gradesForSubject.length) : null;

    res.render("subject", {
        currentUser: req.session.user,
        subject: subject,
        average: average
    });
})

/**
 * GET "/timer"
 * 
 * Rendert die Timer-Seite.
 * - Optionale Query-Parameter:
 *   - `error`: Fehlermeldung anzeigen
 *   - `success`: Erfolgsmeldung anzeigen
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/timer", (req, res) => {
    res.render("timer", { error: req.query.error, success: req.query.success });
})

/**
 * GET "/todo"
 * 
 * Rendert die Todo-Seite für den aktuell eingeloggten Benutzer.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Lädt die Benutzerdaten aus `userdata/<username>.json`.
 * - Übergibt folgende Daten an das EJS-Template:
 *   - `error` / `success`: optionale Query-Parameter
 *   - `todos`: Array der Subjects des Benutzers (mit Todos)
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/todo", requireLogin, async(req, res) => {
    //Das subjects objekt wird übergeben
    const username = req.session.user.username;
    if(!username) {
        return res.redirect("/auth/login")
    };
    const userData = await loadUserData(username);

    res.render("todo", {
        error: req.query.error,
        success: req.query.success,
        todos: userData.subjects || []
    });
})

/**
 * GET "/api/subjects"
 * 
 * Liefert die Subjects des aktuell eingeloggten Benutzers als JSON.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Prüft, ob ein Benutzername in der Session existiert, sonst 401 Unauthorized.
 * - Lädt die Benutzerdaten aus `userdata/<username>.json`.
 * - Gibt nur das `subjects`-Array zurück.
 * - Bei Fehlern wird Status 500 mit JSON-Fehler zurückgegeben.
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/api/subjects", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    if(!username) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const userData = await loadUserData(username);
        // nur die subjects zurückgeben
        const subjects = userData.subjects || [];
        res.json(subjects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Serverfehler" });
    }
})

//Grades API (per-user, Daten in userdata/username.json)

/**
 * GET "/api/grades"
 * 
 * Liefert die Noten (grades) des aktuell eingeloggten Benutzers als JSON.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Lädt die Benutzerdaten aus `userdata/<username>.json`.
 * - Gibt das `grades`-Array zurück oder ein leeres Array, falls keine Noten vorhanden sind.
 * - Bei Fehlern wird Status 500 mit JSON-Fehler zurückgegeben.
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/api/grades", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    try {
        const userData = await loadUserData(username);
        res.json(userData.grades || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Serverfehler" });
    }
});

/**
 * POST "/api/grades"
 * 
 * Legt eine neue Note für den aktuell eingeloggten Benutzer an.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Erwartet folgende Felder im Request-Body:
 *   - `subject` (string): Name des Fachs
 *   - `date` (string): Prüfungsdatum
 *   - `grade` (number): Note
 *   - `title` (string): Bezeichnung der Note
 *   - `locked` (boolean, optional): Gibt an, ob die Note gesperrt ist (default: false)
 * - Validiert, dass alle Pflichtfelder vorhanden sind, sonst 400 Bad Request.
 * - Speichert die neue Note in `userdata/<username>.json`.
 * - Gibt die erstellte Note als JSON zurück mit Status 201 Created.
 * - Bei Fehlern wird Status 500 mit JSON-Fehler zurückgegeben.
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.post("/api/grades", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const { subject, date, grade, title, locked } = req.body;
    if (!subject || !date || typeof grade === 'undefined' || !title) {
        return res.status(400).json({ error: "Missing fields" });
    }
    try {
        const userData = await loadUserData(username);
        userData.grades = userData.grades || [];
        const newGrade = {
            id: crypto.randomUUID(),
            subject: String(subject),
            date: String(date),
            grade: Number(grade),
            title: String(title),
            locked: Boolean(locked) // optional flag, default false
        };
        userData.grades.push(newGrade);
        await saveUserData(username, userData);
        res.status(201).json(newGrade);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Serverfehler" });
    }
});

/**
 * DELETE "/api/grades/:id"
 * 
 * Löscht eine Note des aktuell eingeloggten Benutzers anhand der Note-ID.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - URL-Parameter:
 *   - `id` (string): ID der Note, die gelöscht werden soll.
 * - Prüft, ob die Note existiert, sonst 404 Not Found.
 * - Prüft, ob die Note gesperrt (`locked`) ist; gesperrte Noten können nicht gelöscht werden (403 Forbidden).
 * - Löscht die Note aus `userdata/<username>.json` und gibt Status 204 No Content zurück.
 * - Bei Fehlern wird Status 500 mit JSON-Fehler zurückgegeben.
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.delete("/api/grades/:id", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const id = req.params.id;
    try {
        const userData = await loadUserData(username);
        userData.grades = userData.grades || [];
        const idx = userData.grades.findIndex(g => g.id === id);
        if (idx === -1) return res.status(404).json({ error: "Not found" });
        const grade = userData.grades[idx];
        if (grade.locked) {
            return res.status(403).json({ error: "Locked grade cannot be deleted" });
        }
        userData.grades.splice(idx, 1);
        await saveUserData(username, userData);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Serverfehler" });
    }
});

/**
 * GET "/grades"
 * 
 * Rendert die Notenübersichts-Seite für den aktuell eingeloggten Benutzer.
 * 
 * - Diese Route ist durch `requireLogin` geschützt.
 * - Lädt die Benutzerdaten aus `userdata/<username>.json`.
 * - Übergibt die Fächer (`subjects`) an das EJS-Template `grades`.
 * - Das Template kann die Noten und zugehörigen Fächer anzeigen.
 * 
 * @async
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/grades", requireLogin, async (req, res) => {
    const userData = await loadUserData(req.session.user.username);

    res.render("grades", {
        currentUser: req.session.user,
        subjects: userData.subjects
    });
});

/**
 * GET "/impressum"
 * 
 * Rendert die Impressum-Seite.
 * 
 * - Zeigt optionale Statusmeldungen an (`error` oder `success`) über Query-Parameter.
 * - EJS-Template: `impressum`.
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/impressum", (req, res) => {
    res.render("impressum", { error: req.query.error, success: req.query.success });
})


/**
 * GET "/datenschutz"
 * 
 * Rendert die Datenschutz-Seite.
 * 
 * - Zeigt optionale Statusmeldungen an (`error` oder `success`) über Query-Parameter.
 * - EJS-Template: `datenschutz`.
 * 
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
app.get("/datenschutz", (req, res) => {
    res.render("datenschutz", { error: req.query.error, success: req.query.success });
})

/**
 * POST "/auth/register"
 * 
 * Registriert einen neuen Benutzer.
 * 
 * - Prüft Pflichtfelder: Vorname, Nachname, Benutzername, Passwort, Passwort-Bestätigung.
 * - Prüft, ob die beiden Passwörter übereinstimmen.
 * - Prüft Passwortstärke via `isStrongPassword`.
 * - Prüft, ob der Benutzername bereits existiert.
 * - Hashes das Passwort mit bcrypt und speichert den neuen Benutzer in `users.json`.
 * - Legt eine initiale User-Daten-Datei unter `data/userdata/<username>.json` an mit leeren Subjects und Grades.
 * - Leitet bei Erfolg auf `/auth/login?success=created` um, ansonsten auf `/auth/register?error=<code>`.
 * 
 * @async
 * @param {object} req - Express Request-Objekt, enthält Registrierungsdaten im Body
 * @param {object} res - Express Response-Objekt, wird für Redirects genutzt
 */
app.post("/auth/register", async (req, res) => {
    const { prename, lastname, username, passwordone, passwordtwo } = req.body;
    if (!prename || !lastname || !username || !passwordone || !passwordtwo) {
        return res.redirect("/auth/register?error=required");
    }
    if (passwordone !== passwordtwo) {
        return res.redirect("/auth/register?error=mismatch");
    }
    if (!isStrongPassword(passwordone)) {
        return res.redirect("/auth/register?error=password");
    }

    const cleanUsername = String(username).trim();
    const cleanPrename = String(prename).trim();
    const cleanLastname = String(lastname).trim();
    if (!cleanUsername || !cleanPrename || !cleanLastname) {
        return res.redirect("/auth/register?error=required");
    }

    const usersData = await loadUsers();
    const existing = usersData.users.find(
        (user) => String(user.username) === cleanUsername
    );
    if (existing) {
        return res.redirect("/auth/register?error=exists");
    }

    const passwordHash = await bcrypt.hash(passwordone, 10);
    usersData.users.push({
        prename: cleanPrename,
        lastname: cleanLastname,
        username: cleanUsername,
        password_hash: passwordHash
    });
    await saveUsers(usersData);

    const userFilePath = path.join(__dirname, "data", "userdata", `${cleanUsername}.json`);
    const defaultUserData = {
        subjects: [],
        grades: []
    };

    try {
        await fs.writeFile(userFilePath, JSON.stringify(defaultUserData, null, 2), "utf8");
    } catch (err) {
        console.error("Fehler beim Anlegen der User-Datei:", err);
        return res.redirect("/auth/register?error=file");
    }


    return res.redirect("/auth/login?success=created");
});

/**
 * POST "/auth/login"
 * 
 * Authentifiziert einen Benutzer und erstellt eine Session.
 * 
 * - Prüft die IP-Rate-Limiting-Regel, um Brute-Force-Angriffe zu verhindern.
 * - Validiert Pflichtfelder: Benutzername und Passwort.
 * - Lädt die Benutzerdaten aus `users.json`.
 * - Vergleicht das eingegebene Passwort mit dem gespeicherten Hash (bcrypt).
 * - Bei erfolgreicher Authentifizierung wird `req.session.user` gesetzt.
 * - Leitet bei Erfolg auf `/subjects?success=login` weiter, bei Fehlern auf `/auth/login?error=<code>`.
 * 
 * @async
 * @param {object} req - Express Request-Objekt, enthält Login-Daten im Body
 * @param {object} res - Express Response-Objekt, wird für Redirects genutzt
 */
app.post("/auth/login", async (req, res) => {
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    if (isLoginRateLimited(clientIp)) {
        return res.redirect("/auth/login?error=ratelimit");
    }

    const { username, password } = req.body;
    if (!username || !password) return res.redirect("/auth/login?error=required");

    const usersData = await loadUsers();
    const candidate = usersData.users.find(
        (user) => String(user.username) === String(username).trim()
    );
    if (!candidate) return res.redirect("/auth/login?error=invalid");
    
    const match = await bcrypt.compare(password, candidate.password_hash);
    if (!match) return res.redirect("/auth/login?error=invalid");

    req.session.user = {
        prename: candidate.prename,
        lastname: candidate.lastname,
        username: candidate.username
    };
    return res.redirect("/subjects?success=login");
});

/**
 * POST "/subjects/add"
 * 
 * Fügt ein neues Fach (Subject) für den aktuell eingeloggten Benutzer hinzu.
 * 
 * - Durch `requireLogin` geschützt.
 * - Prüft, ob ein Name für das Fach angegeben wurde.
 * - Generiert eine eindeutige ID basierend auf dem aktuellen Timestamp.
 * - Initialisiert das Fach mit leeren Werten für Prüfungsdatum, Note und Todos.
 * - Speichert das aktualisierte Benutzerobjekt in `userdata/<username>.json`.
 * - Leitet anschließend auf `/subjects?success=created` weiter.
 * 
 * @async
 * @param {object} req - Express Request-Objekt, enthält den Namen des neuen Fachs im Body
 * @param {object} res - Express Response-Objekt, wird für Redirect genutzt
 */
app.post("/subjects/add", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const userData = await loadUserData(username);

    const { name } = req.body;
    if (!name) {
        return res.redirect("/subjects?error=noname");
    }

    // Neue Subject-ID generieren timestamp damit sich keine IDs doppeln
    const newSubject = {
        id: `subject${Date.now()}`,
        name: name.trim(),
        examDate:"",
        grade:"",
        note: "",
        todos: []
    };

    userData.subjects.push(newSubject);
    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2), "utf8");

    // Seite neu laden, um das neue Subject zu sehen
    return res.redirect("/subjects?success=created");
});

/**
 * POST "/subjects/delete"
 * 
 * Löscht ein vorhandenes Fach (Subject) des aktuell eingeloggten Benutzers.
 * 
 * - Durch `requireLogin` geschützt.
 * - Prüft, ob eine Subject-ID im Request-Body übergeben wurde.
 * - Filtert das Fach aus der Benutzerliste. Wenn keine Änderung erfolgt, wird ein Fehler-Redirect ausgeführt.
 * - Speichert das aktualisierte Benutzerobjekt in `userdata/<username>.json`.
 * - Leitet anschließend auf `/subjects?success=deleted` weiter.
 * 
 * @async
 * @param {object} req - Express Request-Objekt, enthält die ID des zu löschenden Fachs im Body
 * @param {object} res - Express Response-Objekt, wird für Redirect genutzt
 */
app.post("/subjects/delete", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const userData = await loadUserData(username);

    const { id } = req.body;
    if (!id) {
        return res.redirect("/subjects?error=noID");
    }

    const initialLength = userData.subjects.length;
    userData.subjects = userData.subjects.filter(s=> s.id != id);
    if(userData.subjects.length === initialLength){
        return res.redirect(`/subjects/${id}?error=notfound`);
    }

    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2), "utf8");

    // Zurück zur übersicht
    return res.redirect("/subjects?success=deleted");
});

/**
 * POST "/subjects/:id/save"
 * 
 * Speichert die Änderungen eines Fachs (Subject) für den aktuell eingeloggten Benutzer.
 * 
 * - Durch `requireLogin` geschützt.
 * - Holt das Fach anhand der URL-Parameter-ID.
 * - Aktualisiert Prüfungsdatum, Todos und Notizen aus dem Request-Body.
 * - Speichert die geänderten Benutzerdaten in `userdata/<username>.json`.
 * - Gibt HTTP 200 zurück, wenn erfolgreich, oder 404, falls das Fach nicht gefunden wird.
 * 
 * @async
 * @param {object} req - Express Request-Objekt, enthält Subject-ID in `req.params.id` und die zu speichernden Felder im Body
 * @param {object} res - Express Response-Objekt, wird für Status-Code genutzt
 */app.post("/subjects/:id/save", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const subjectId = req.params.id;
    const userData = await loadUserData(username);

    const subject = userData.subjects.find(s => s.id === subjectId);
    if (!subject) {
        return res.status(404).send("Subject nicht gefunden");
    }

    const { examDate, todos, notes } = req.body;
    subject.examDate = examDate;
    subject.todos = todos;
    subject.note = notes;

    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2), "utf8");

    res.sendStatus(200);
});

// =======================
// Server starten
// =======================
app.listen(3000, "0.0.0.0", () => console.log("Listening on http://127.0.0.1:3000"));
