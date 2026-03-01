// grades.js

(() => {
    const listBox = document.getElementById("list-box");
    const graphBox = document.getElementById("graph-box");
    const gradeListEl = document.getElementById("grade-list");
    const graphEl = document.getElementById("graph");

    if (!listBox || !graphBox || !gradeListEl || !graphEl) return;

    const getCsrf = () => {
        const m = document.querySelector('meta[name="csrf-token"]');
        return m ? m.getAttribute('content') : null;
    };

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

    // ----- Data stores -----
    let subjects = []; // from /api/subjects
    let grades = [];   // from /api/grades

    const bySubject = new Map();
    function rebuildIndex() {
        bySubject.clear();
        for (const s of subjects) {
            bySubject.set(s.name, []);
        }
        for (const g of grades) {
            if (!bySubject.has(g.subject)) bySubject.set(g.subject, []);
            bySubject.get(g.subject).push(g);
        }
        for (const [_, arr] of bySubject) arr.sort((a, b) => a.date.localeCompare(b.date));
    }

    const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("de-DE");

    let activeSubject = "";

    // ----- Server interactions -----
    async function loadData() {
        try {
            const [sRes, gRes] = await Promise.all([
                fetch('/api/subjects'),
                fetch('/api/grades')
            ]);
            if (!sRes.ok) throw new Error('Failed to load subjects');
            if (!gRes.ok) throw new Error('Failed to load grades');
            subjects = await sRes.json();
            grades = await gRes.json();
            rebuildIndex();
            const keys = [...bySubject.keys()].sort();
            activeSubject = keys[0] ?? "";
            renderList();
            if (activeSubject) renderGraph(activeSubject);
            else graphEl.innerHTML = "<div style='color:var(--muted)'>Keine Fächer/Daten.</div>";
        } catch (err) {
            console.error(err);
            gradeListEl.innerHTML = "<div style='color:var(--muted)'>Fehler beim Laden der Daten.</div>";
            graphEl.innerHTML = "<div style='color:var(--muted)'>Fehler beim Laden der Daten.</div>";
        }
    }

    async function addGradeToServer({ subject, date, grade, title }) {
        const token = getCsrf();
        const res = await fetch('/api/grades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'x-csrf-token': token } : {})
            },
            body: JSON.stringify({ subject, date, grade, title })
        });
        if (!res.ok) throw new Error('Failed to save grade');
        return res.json();
    }

    async function deleteGradeOnServer(id) {
        const token = getCsrf();
        const res = await fetch(`/api/grades/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                ...(token ? { 'x-csrf-token': token } : {})
            }
        });
        if (!res.ok && res.status !== 204) throw new Error('Failed to delete grade');
    }

    // ----- CRUD helpers -----
    async function addGrade({ subject, date, grade, title }) {
        const created = await addGradeToServer({ subject, date, grade, title });
        grades.push(created);
        rebuildIndex();
    }

    async function deleteGradeById(id) {
        const idx = grades.findIndex(g => g.id === id);
        if (idx === -1) return;
        const removed = grades[idx];
        try {
            await deleteGradeOnServer(id);
            grades.splice(idx, 1);
            rebuildIndex();
            // adjust active subject if needed
            const data = bySubject.get(activeSubject) ?? [];
            if (activeSubject === removed.subject && data.length === 0) {
                activeSubject = [...bySubject.keys()].sort()[0] ?? "";
            }
        } catch (err) {
            alert('Fehler beim Löschen der Note');
            console.error(err);
        }
    }

    // ----- UI: Create grade -----
    const externalCreateBtn = document.getElementById("create-grade-btn");

    function openCreateDialog(defaultSubject = activeSubject) {
        const subjNames = [...bySubject.keys()].sort();
        // Instead of asking for subject, use the defaultSubject provided by the caller
        const s = defaultSubject || subjNames[0] || "Mathe";
        if (!s) return;

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

        // When called from a subject-specific 'Neu' button we want the grade to be created for that subject.
        addGrade({ subject: s.trim(), date: date.trim(), grade: g, title: title.trim() })
            .then(() => {
                activeSubject = s.trim() || activeSubject;
                renderList();
                renderGraph(activeSubject);
            })
            .catch(err => { alert('Fehler beim Speichern'); console.error(err); });
    }

    if (externalCreateBtn) {
        externalCreateBtn.addEventListener("click", () => openCreateDialog(activeSubject));
    }

    // ----- LIST -----
    function renderList() {
        const subjectNames = [...bySubject.keys()].sort();
        gradeListEl.innerHTML = "";
        gradeListEl.style.display = "flex";
        gradeListEl.style.flexDirection = "column";
        gradeListEl.style.gap = "10px";

        for (const subject of subjectNames) {
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
                val.textContent = Number(g.grade).toFixed(1);
                val.style.fontWeight = "800";

                const del = document.createElement("button");
                del.textContent = "\u2715";
                del.title = "Note löschen";
                del.style.padding = "6px 10px";
                del.style.borderRadius = "10px";

                // If grade is locked, disable delete and show badge
                if (g.locked) {
                    del.disabled = true;
                    del.title = "Diese Note wurde übernommen und kann nicht gelöscht werden";

                    const badge = document.createElement("span");
                    badge.textContent = "Übernommen";
                    badge.style.background = "var(--muted)";
                    badge.style.color = "white";
                    badge.style.padding = "4px 8px";
                    badge.style.borderRadius = "8px";
                    badge.style.fontSize = "12px";
                    right.appendChild(badge);
                } else {
                    del.addEventListener("click", (e) => {
                        e.stopPropagation(); // nicht gleichzeitig "Anzeigen"
                        const ok = confirm(`Note löschen?\n${subject} – ${g.title} (${fmtDate(g.date)})`);
                        if (!ok) return;
                        deleteGradeById(g.id).then(() => {
                            renderList();
                            if (activeSubject) renderGraph(activeSubject);
                            else graphEl.innerHTML = "<div style='color:var(--muted)'>Keine Fächer/Daten mehr.</div>";
                        });
                    });
                }

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
            ctx.fillText("1.0 = besser (oben)  \u00b7  6.0 = schlechter (unten)", pad.l, h - 6);
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
    loadData();
})();
