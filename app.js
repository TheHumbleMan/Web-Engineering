const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const session = require("express-session");
require("dotenv").config();

const SESSION_SECRET_MIN_LENGTH = 32;
const sessionSecret = process.env.SESSION_SECRET;

if (typeof sessionSecret !== "string" || sessionSecret.trim().length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(
        `SESSION_SECRET fehlt oder ist zu kurz. Setze ein sicheres Secret in .env (mindestens ${SESSION_SECRET_MIN_LENGTH} Zeichen).`
    );
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PASSWORD_MIN_LENGTH = 8;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 60 * 1000;
const loginAttemptsByIp = new Map();

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

async function ensureDataStore() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(USERS_FILE);
    } catch (err) {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
}

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

async function loadUserData(username){
    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    const rawData = await fs.readFile(filePath, "utf8");
    return JSON.parse(rawData);
}

async function saveUsers(data) {
    await ensureDataStore();
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

async function saveUserData(username, data) {
    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/auth/login?error=access");
    }
    next();
}

// Root-URL Redirect
app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/subjects");
    }
    return res.redirect("/auth/login");
});

// Login-Seite rendern (EJS!)
app.get("/auth/login", (req, res) => {
    res.render("login", { error: req.query.error, success: req.query.success });
});
app.get("/auth/register", (req, res) => {
    res.render("register", { error: req.query.error, success: req.query.success });
})
app.get("/about", (req, res) => {
    res.render("about", { error: req.query.error, success: req.query.success });
})
app.get("/subjects", requireLogin, async (req, res) => {
    const userData = await loadUserData(req.session.user.username);
    res.render("subjects", {
        error: req.query.error,
        success: req.query.success,
        currentUser: req.session.user,
        subjects: userData.subjects
    });
})
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
app.get("/timer", (req, res) => {
    res.render("timer", { error: req.query.error, success: req.query.success });
})
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

// ----- Grades API (per-user, persisted in userdata/username.json) -----
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

app.post("/api/grades", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const { subject, date, grade, title } = req.body;
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
            title: String(title)
        };
        userData.grades.push(newGrade);
        await saveUserData(username, userData);
        res.status(201).json(newGrade);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Serverfehler" });
    }
});

app.delete("/api/grades/:id", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const id = req.params.id;
    try {
        const userData = await loadUserData(username);
        userData.grades = userData.grades || [];
        const idx = userData.grades.findIndex(g => g.id === id);
        if (idx === -1) return res.status(404).json({ error: "Not found" });
        userData.grades.splice(idx, 1);
        await saveUserData(username, userData);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Serverfehler" });
    }
});

app.get("/grades", requireLogin, async (req, res) => {
    const userData = await loadUserData(req.session.user.username);

    res.render("grades", {
        currentUser: req.session.user,
        subjects: userData.subjects
    });
});
app.get("/impressum", (req, res) => {
    res.render("impressum", { error: req.query.error, success: req.query.success });
})
app.get("/datenschutz", (req, res) => {
    res.render("datenschutz", { error: req.query.error, success: req.query.success });
})
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

app.post("/subjects/:id/save", requireLogin, async (req, res) => {
    const username = req.session.user.username;
    const subjectId = req.params.id;
    const userData = await loadUserData(username);

    const subject = userData.subjects.find(s => s.id === subjectId);
    if (!subject) {
        return res.status(404).send("Subject nicht gefunden");
    }

    const { examDate, grade, todos, notes } = req.body;
    subject.examDate = examDate;
    subject.grade = grade;
    subject.todos = todos;
    subject.note = notes;

    const filePath = path.join(__dirname, "data", "userdata", `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2), "utf8");

    res.sendStatus(200);
});

app.listen(3000, "0.0.0.0", () => console.log("Listening on http://127.0.0.1:3000"));
