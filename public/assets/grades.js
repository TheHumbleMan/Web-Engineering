// grades.js

(() => {
    const listBox = document.getElementById("list-box");
    const graphBox = document.getElementById("graph-box");
    const gradeListEl = document.getElementById("grade-list");
    const graphEl = document.getElementById("graph");


    if (!listBox || !graphBox || !gradeListEl || !graphEl) return;

    const makeId = () => {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
            return globalThis.crypto.randomUUID();
        }
        return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    };

    // Layout
    const main = listBox.closest("main");
    if (main) {
        main.style.display = "flex";
        main.style.flexDirection = "row";
        main.style.gap = "16px";
        main.style.padding = "16px";
    }
    listBox.style.flex = "0 0 40%";
    listBox.style.minWidth = "280px";
    graphBox.style.flex = "1";
    graphBox.style.minWidth = "320px";

    for (const el of [listBox, graphBox]) {
        el.style.border = "1px solid var(--border)";
        el.style.borderRadius = "15px";
        el.style.background = "var(--card)";
        el.style.padding = "12px";
        el.style.overflow = "auto";
    }

    // ----- Daten -----
    const grades = [
        { id: makeId(), subject: "Mathe",    date: "2025-09-10", grade: 3.0, title: "Test: Lineare Funktionen" },
        { id: makeId(), subject: "Mathe",    date: "2025-10-05", grade: 2.0, title: "Klassenarbeit: Gleichungen" },
        { id: makeId(), subject: "Mathe",    date: "2025-11-18", grade: 2.3, title: "Kurztest: Ableitungen" },
        { id: makeId(), subject: "Mathe",    date: "2026-01-20", grade: 1.7, title: "Klassenarbeit: Analysis" },

        { id: makeId(), subject: "Deutsch",  date: "2025-09-22", grade: 2.7, title: "Aufsatz: Analyse" },
        { id: makeId(), subject: "Deutsch",  date: "2025-10-28", grade: 2.0, title: "Referat: Lyrik" },
        { id: makeId(), subject: "Deutsch",  date: "2025-12-09", grade: 1.7, title: "Klausur: Interpretation" },

        { id: makeId(), subject: "Englisch", date: "2025-09-15", grade: 2.3, title: "Vocabulary Test" },
        { id: makeId(), subject: "Englisch", date: "2025-11-03", grade: 1.7, title: "Essay" },
        { id: makeId(), subject: "Englisch", date: "2026-01-12", grade: 2.0, title: "Listening" },

        { id: makeId(), subject: "Physik",   date: "2025-10-01", grade: 3.3, title: "Test: Bewegung" },
        { id: makeId(), subject: "Physik",   date: "2025-11-25", grade: 2.7, title: "Kurztest: Kräfte" },
        { id: makeId(), subject: "Physik",   date: "2026-01-28", grade: 2.0, title: "Klassenarbeit: Energie" },
    ].slice().sort((a, b) => a.date.localeCompare(b.date));

    const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("de-DE");

    // subject -> array
    const bySubject = new Map();
    function rebuildIndex() {
        bySubject.clear();
        for (const g of grades) {
            if (!bySubject.has(g.subject)) bySubject.set(g.subject, []);
            bySubject.get(g.subject).push(g);
        }
        for (const [_, arr] of bySubject) arr.sort((a, b) => a.date.localeCompare(b.date));
    }
    rebuildIndex();

    function getSubjects() {
        return [...bySubject.keys()].sort();
    }

    let activeSubject = getSubjects()[0] ?? "";

    // ----- CRUD -----
    function addGrade({ subject, date, grade, title }) {
        grades.push({
            id: crypto.randomUUID(),
            subject,
            date,
            grade,
            title,
        });
        grades.sort((a, b) => a.date.localeCompare(b.date));
        rebuildIndex();
    }

    function deleteGradeById(id) {
        const idx = grades.findIndex(g => g.id === id);
        if (idx === -1) return;
        const removed = grades[idx];
        grades.splice(idx, 1);
        rebuildIndex();

        // wenn aktives Fach leer wird -> auf erstes verfügbare Fach springen
        const data = bySubject.get(activeSubject) ?? [];
        if (activeSubject === removed.subject && data.length === 0) {
            activeSubject = getSubjects()[0] ?? "";
        }
    }

    // ----- UI: Grade erstellen -----
    const externalCreateBtn = document.getElementById("create-grade-btn");

    function openCreateDialog(defaultSubject = activeSubject) {
        const subjects = getSubjects();
        const s = prompt(`Fach (${subjects.join(", ")}):`, defaultSubject || subjects[0] || "Mathe");
        if (s == null) return;

        const title = prompt("Titel (z.B. Klassenarbeit / Test):", "Neue Note");
        if (title == null) return;

        const date = prompt("Datum (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
        if (date == null) return;

        const gStr = prompt("Note (1.0 - 6.0):", "2.0");
        if (gStr == null) return;

        const g = Number(gStr.replace(",", "."));
        if (!Number.isFinite(g) || g < 1 || g > 6) {
            alert("Ungültige Note. Bitte 1.0 bis 6.0.");
            return;
        }

        addGrade({ subject: s.trim() || "Unbekannt", date: date.trim(), grade: g, title: title.trim() || "Neue Note" });
        activeSubject = s.trim() || activeSubject;
        renderList();
        renderGraph(activeSubject);
    }

    if (externalCreateBtn) {
        externalCreateBtn.addEventListener("click", () => openCreateDialog(activeSubject));
    }

    // ----- LISTE -----
    function renderList() {
        const subjects = getSubjects();
        gradeListEl.innerHTML = "";
        gradeListEl.style.display = "flex";
        gradeListEl.style.flexDirection = "column";
        gradeListEl.style.gap = "10px";

        for (const subject of subjects) {
            const card = document.createElement("div");
            card.style.border = "1px solid var(--border)";
            card.style.borderRadius = "12px";
            card.style.padding = "10px";
            card.style.background = "var(--bg)";

            const head = document.createElement("div");
            head.style.display = "flex";
            head.style.justifyContent = "space-between";
            head.style.alignItems = "center";
            head.style.gap = "8px";
            head.style.marginBottom = "8px";

            const title = document.createElement("div");
            title.textContent = subject;
            title.style.fontWeight = "800";

            const right = document.createElement("div");
            right.style.display = "flex";
            right.style.gap = "8px";

            // pro Fach "Neu" (falls du keinen externen Button nutzt)
            if (!externalCreateBtn) {
                const newBtn = document.createElement("button");
                newBtn.textContent = "Neu";
                newBtn.style.padding = "8px 12px";
                newBtn.style.borderRadius = "10px";
                newBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openCreateDialog(subject);
                });
                right.appendChild(newBtn);
            }

            const showBtn = document.createElement("button");
            showBtn.textContent = "Anzeigen";
            showBtn.style.padding = "8px 12px";
            showBtn.style.borderRadius = "10px";
            showBtn.addEventListener("click", () => setActiveSubject(subject));
            right.appendChild(showBtn);

            head.appendChild(title);
            head.appendChild(right);
            card.appendChild(head);

            const list = bySubject.get(subject) ?? [];
            for (const g of list) {
                const row = document.createElement("div");
                row.style.display = "grid";
                row.style.gridTemplateColumns = "1fr auto";
                row.style.alignItems = "start";
                row.style.gap = "10px";
                row.style.padding = "8px 10px";
                row.style.borderRadius = "10px";
                row.style.border = "1px solid var(--border)";
                row.style.marginBottom = "8px";
                row.style.background = "transparent";

                row.addEventListener("click", () => setActiveSubject(subject));

                const left = document.createElement("div");

                const t = document.createElement("div");
                t.textContent = g.title;

                const meta = document.createElement("div");
                meta.textContent = fmtDate(g.date);
                meta.style.fontSize = "12px";
                meta.style.color = "var(--muted)";

                left.appendChild(t);
                left.appendChild(meta);

                // rechts: Note + Löschen
                const right = document.createElement("div");
                right.style.display = "flex";
                right.style.alignItems = "center";
                right.style.gap = "10px";

                const val = document.createElement("div");
                val.textContent = g.grade.toFixed(1);
                val.style.fontWeight = "800";

                const del = document.createElement("button");
                del.textContent = "✕";
                del.title = "Note löschen";
                del.style.padding = "6px 10px";
                del.style.borderRadius = "10px";

                del.addEventListener("click", (e) => {
                    e.stopPropagation(); // nicht gleichzeitig "Anzeigen"
                    const ok = confirm(`Note löschen?\n${subject} – ${g.title} (${fmtDate(g.date)})`);
                    if (!ok) return;
                    deleteGradeById(g.id);
                    renderList();
                    if (activeSubject) renderGraph(activeSubject);
                    else graphEl.innerHTML = "<div style='color:var(--muted)'>Keine Fächer/Daten mehr.</div>";
                });

                right.appendChild(val);
                right.appendChild(del);

                row.appendChild(left);
                row.appendChild(right);
                card.appendChild(row);
            }

            gradeListEl.appendChild(card);
        }
    }

    // ----- GRAPH (Canvas) -----
    function renderGraph(subject) {
        const data = (bySubject.get(subject) ?? []);
        graphEl.innerHTML = "";

        const title = document.createElement("div");
        title.textContent = `${subject} – Notenverlauf`;
        title.style.fontWeight = "800";
        title.style.margin = "4px 0 10px";
        graphEl.appendChild(title);

        if (data.length === 0) {
            const empty = document.createElement("div");
            empty.textContent = "Keine Daten.";
            empty.style.color = "var(--muted)";
            graphEl.appendChild(empty);
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "320px";
        canvas.style.border = "1px solid var(--border)";
        canvas.style.borderRadius = "12px";
        canvas.style.background = "var(--bg)";
        graphEl.appendChild(canvas);

        const ctx = canvas.getContext("2d");

        const draw = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(300, Math.floor(rect.width));
            const h = Math.max(280, Math.floor(rect.height));

            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            ctx.clearRect(0, 0, w, h);

            const pad = { l: 55, r: 20, t: 20, b: 45 };
            const innerW = w - pad.l - pad.r;
            const innerH = h - pad.t - pad.b;

            const yMin = 1.0, yMax = 6.0;

            const n = data.length;
            const xAt = (i) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
            const yAt = (grade) => pad.t + ((grade - yMin) / (yMax - yMin)) * innerH;

            // Grid + Y Labels
            ctx.strokeStyle = "rgba(0,0,0,0.08)";
            ctx.lineWidth = 1;
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted") || "#888";
            ctx.font = "12px system-ui, sans-serif";

            for (let g = 1; g <= 6; g++) {
                const y = yAt(g);
                ctx.beginPath();
                ctx.moveTo(pad.l, y);
                ctx.lineTo(w - pad.r, y);
                ctx.stroke();
                ctx.fillText(g.toFixed(1), 10, y + 4);
            }

            // Achsen
            ctx.strokeStyle = "rgba(0,0,0,0.18)";
            ctx.beginPath();
            ctx.moveTo(pad.l, pad.t);
            ctx.lineTo(pad.l, h - pad.b);
            ctx.lineTo(w - pad.r, h - pad.b);
            ctx.stroke();

            // X Labels (max 4)
            const labelCount = Math.min(4, n);
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted") || "#888";
            for (let k = 0; k < labelCount; k++) {
                const i = Math.round((k / (labelCount - 1 || 1)) * (n - 1));
                const x = xAt(i);
                const dateStr = fmtDate(data[i].date);
                ctx.save();
                ctx.translate(x, h - 10);
                ctx.rotate(-Math.PI / 6);
                ctx.textAlign = "right";
                ctx.fillText(dateStr, 0, 0);
                ctx.restore();
            }

            // Linie
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent") || "#007bff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const x = xAt(i);
                const y = yAt(data[i].grade);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Punkte + Werte
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = "12px system-ui, sans-serif";
            ctx.textAlign = "left";
            for (let i = 0; i < n; i++) {
                const x = xAt(i);
                const y = yAt(data[i].grade);
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillText(data[i].grade.toFixed(1), x + 8, y + 4);
            }

            // Hinweis
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted") || "#888";
            ctx.textAlign = "left";
            ctx.fillText("1.0 = besser (oben)  ·  6.0 = schlechter (unten)", pad.l, h - 6);
        };

        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(canvas);
    }

    function setActiveSubject(subject) {
        activeSubject = subject;
        renderGraph(activeSubject);
    }

    // Init
    renderList();
    if (activeSubject) renderGraph(activeSubject);
})();