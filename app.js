const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true })); // für POST form data
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
app.get("/subjects", requireLogin, (req, res) => {
    res.render("subjects", {
        error: req.query.error,
        success: req.query.success,
        currentUser: req.session.user
    });
})
app.get("/subject", (req, res) => {
    res.render("subject", { error: req.query.error, success: req.query.success });
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

app.listen(3000, "127.0.0.1", () => console.log("Listening on http://127.0.0.1:3000"));
