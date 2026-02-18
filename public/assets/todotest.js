const todos = [
    { nr: 1, name: "Mathe lernen", prio: "hoch",   deadline: "2026-02-20T18:00:00" },
    { nr: 2, name: "Projekt",      prio: "mittel", deadline: "2026-02-19T12:00:00" },
    { nr: 3, name: "Sport",        prio: "niedrig",deadline: "2026-02-25T09:00:00" },
];

function renderTodos(todos) {
    const container = document.getElementById("todo-block");
    if (!container) return;

    container.innerHTML = "";

    for (const t of todos) {
        const ts = new Date(t.deadline).getTime();
        const dateStr = Number.isFinite(ts) ? new Date(ts).toLocaleString("de-DE") : "—";
        const remaining = Number.isFinite(ts) ? calculateRemaining(ts) : "—";

        const div = document.createElement("div");
        div.className = "todo";
        div.id = `todo-${t.nr}`; // fürs Scrollen von der Timeline

        div.innerHTML = `
      <span class="todo-nr">${t.nr}:</span>
      <span class="todo-name">${t.name}</span>
      <span class="todo-prio">${t.prio}</span>
      <span class="todo-deadline">${dateStr}</span>
      <span class="todo-remaining">${remaining}</span>
    `;

        container.appendChild(div);
    }
}

function calculateRemaining(deadlineTs) {
    const diff = deadlineTs - Date.now();
    if (diff <= 0) return "abgelaufen";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    return `${days}d ${hours}h ${mins}m`;
}

function renderTimeline(todos) {
    const markersHost = document.getElementById("tl-markers");
    if (!markersHost) return;

    markersHost.innerHTML = "";
    const now = Date.now();

    const items = todos
        .map(t => ({ ...t, ts: new Date(t.deadline).getTime() }))
        .filter(t => Number.isFinite(t.ts));

    if (items.length === 0) return;

    const maxTs = Math.max(...items.map(t => t.ts), now + 1);

    const future = items.filter(t => t.ts >= now).sort((a, b) => a.ts - b.ts);
    const nextNr = future.length ? future[0].nr : null;

    for (const t of items) {
        const pos = (t.ts - now) / (maxTs - now);
        const leftPct = Math.max(0, Math.min(1, pos)) * 100;

        const m = document.createElement("div");
        m.className = "tl-marker" + (t.nr === nextNr ? " next" : "");
        m.style.left = `${leftPct}%`;
        m.textContent = t.nr;

        const dateStr = new Date(t.ts).toLocaleString("de-DE");
        m.title = `Todo ${t.nr}: ${t.name}\nDeadline: ${dateStr}`;

        m.addEventListener("click", () => {
            const el = document.getElementById(`todo-${t.nr}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        markersHost.appendChild(m);
    }
}

function tickTime() {
    const t = document.getElementById("time-span");
    if (t) t.textContent = new Date().toLocaleString("de-DE");
}

/* initial */
renderTodos(todos);
renderTimeline(todos);
tickTime();


setInterval(() => {
    renderTodos(todos);
    renderTimeline(todos);
}, 60_000);

setInterval(tickTime, 1000);
