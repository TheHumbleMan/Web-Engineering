// grades.js

(() => {
    const listBox = document.getElementById("list-box");
    const graphBox = document.getElementById("graph-box");
    const gradeListEl = document.getElementById("grade-list");
    const graphEl = document.getElementById("graph");

    if (!listBox || !graphBox || !gradeListEl || !graphEl) return;

    // Layout (links Liste, rechts Graph) – ohne deine style.css zu ändern
    // (setzt nur Inline-Styles für diesen Bereich)
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

    // kleine Card-Optik passend zu deinen Variablen
    for (const el of [listBox, graphBox]) {
        el.style.border = "1px solid var(--border)";
        el.style.borderRadius = "15px";
        el.style.background = "var(--card)";
        el.style.padding = "12px";
        el.style.overflow = "auto";
    }

    // Beispieldaten: Fach, Note, Datum, Titel
    const grades = [
        { subject: "Mathe",    date: "2025-09-10", grade: 3.0, title: "Test: Lineare Funktionen" },
        { subject: "Mathe",    date: "2025-10-05", grade: 2.0, title: "Klassenarbeit: Gleichungen" },
        { subject: "Mathe",    date: "2025-11-18", grade: 2.3, title: "Kurztest: Ableitungen" },
        { subject: "Mathe",    date: "2026-01-20", grade: 1.7, title: "Klassenarbeit: Analysis" },

        { subject: "Deutsch",  date: "2025-09-22", grade: 2.7, title: "Aufsatz: Analyse" },
        { subject: "Deutsch",  date: "2025-10-28", grade: 2.0, title: "Referat: Lyrik" },
        { subject: "Deutsch",  date: "2025-12-09", grade: 1.7, title: "Klausur: Interpretation" },

        { subject: "Englisch", date: "2025-09-15", grade: 2.3, title: "Vocabulary Test" },
        { subject: "Englisch", date: "2025-11-03", grade: 1.7, title: "Essay" },
        { subject: "Englisch", date: "2026-01-12", grade: 2.0, title: "Listening" },

        { subject: "Physik",   date: "2025-10-01", grade: 3.3, title: "Test: Bewegung" },
        { subject: "Physik",   date: "2025-11-25", grade: 2.7, title: "Kurztest: Kräfte" },
        { subject: "Physik",   date: "2026-01-28", grade: 2.0, title: "Klassenarbeit: Energie" },
    ].slice().sort((a, b) => a.date.localeCompare(b.date));

    const subjects = [...new Set(grades.map(g => g.subject))].sort();
    let activeSubject = subjects[0] ?? "";

    const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("de-DE");

    function groupBySubject(items) {
        const m = new Map();
        for (const g of items) {
            if (!m.has(g.subject)) m.set(g.subject, []);
            m.get(g.subject).push(g);
        }
        for (const [k, arr] of m) arr.sort((a, b) => a.date.localeCompare(b.date));
        return m;
    }

    const bySubject = groupBySubject(grades);

    // ----------- LISTE -----------
    function renderList() {
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

            const btn = document.createElement("button");
            btn.textContent = "Anzeigen";
            btn.style.padding = "8px 12px";
            btn.style.borderRadius = "10px";
            btn.addEventListener("click", () => setActiveSubject(subject));

            head.appendChild(title);
            head.appendChild(btn);
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
                row.style.cursor = "pointer";
                row.style.marginBottom = "8px";
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

                const val = document.createElement("div");
                val.textContent = g.grade.toFixed(1);
                val.style.fontWeight = "800";

                row.appendChild(left);
                row.appendChild(val);
                card.appendChild(row);
            }

            gradeListEl.appendChild(card);
        }
    }

    // ----------- GRAPH (Canvas, ohne Lib) -----------
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

            // Skala (deutsch üblich): 1.0 oben (gut) bis 6.0 unten (schlecht)
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

        // initial + responsive
        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(canvas);
    }

    function setActiveSubject(subject) {
        activeSubject = subject;
        renderGraph(activeSubject);
        // optional: visuelles Feedback in der Liste (simpel)
        [...gradeListEl.querySelectorAll("div")].forEach(() => {}); // bewusst leer, keine CSS-Klassen nötig
    }

    // Init
    renderList();
    setActiveSubject(activeSubject);
})();