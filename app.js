const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const bcrypt = require("bcryptjs");
const session = require("express-session");

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
        secret: process.env.SESSION_SECRET || "web-engineering-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax"
        }
    })
);
app.use("/assets", express.static(path.join(__dirname, "public/assets")));
app.use("/img", express.static(path.join(__dirname, "img")));

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

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

    res.render("subject", {
        currentUser: req.session.user,
        subject: subject
    });
})
app.get("/timer", (req, res) => {
    res.render("timer", { error: req.query.error, success: req.query.success });
})
app.get("/todo", (req, res) => {
    res.render("todo", { error: req.query.error, success: req.query.success });
})

app.post("/auth/register", async (req, res) => {
    const { prename, lastname, username, passwordone, passwordtwo } = req.body;
    if (!prename || !lastname || !username || !passwordone || !passwordtwo) {
        return res.redirect("/auth/register?error=required");
    }
    if (passwordone !== passwordtwo) {
        return res.redirect("/auth/register?error=mismatch");
    }

    const cleanUsername = String(username).trim();
    const cleanPrename = String(prename).trim();
    const cleanLastname = String(lastname).trim();
    if (!cleanUsername || !cleanPrename || !cleanLastname) {
        return res.redirect("/auth/register?error=required");
    }

    const usersData = await loadUsers();
    const existing = usersData.users.find(
        (user) => String(user.username).toLowerCase() === cleanUsername.toLowerCase()
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
        subjects: []
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

app.listen(3000, "127.0.0.1", () => console.log("Listening on http://127.0.0.1:3000"));
