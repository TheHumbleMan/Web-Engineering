const express = require("express");
const path = require("path");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true })); // für POST form data
app.use("/assets", express.static(path.join(__dirname, "public/assets")));
app.use("/img", express.static(path.join(__dirname, "img")));


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
app.get("/subjects", (req, res) => {
    res.render("subjects", { error: req.query.error, success: req.query.success });
})

// Dummy-POST (später dein echtes Backend-Login)
app.post("/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.redirect("/auth/login?error=required");
    return res.redirect("/auth/login?error=invalid"); // nur zum Test
});

app.listen(3000, "127.0.0.1", () => console.log("Listening on http://127.0.0.1:3000"));
