/**
 * @file todotest.js
 * @description JavaScript für die Todo-Test-Seite der Lernhilfe-WebApp.
 * Verwaltet das Anzeigen und Testen von Todos.
 */

/**
 * Rendert alle Todos in der Todo-Übersicht.
 * 
 * @param {Array<Object>} todos - Array von Todo-Objekten mit Feldern:
 *   - text {string}: Name des Todos
 *   - prio {string}: Priorität ("hoch", "mittel", "niedrig")
 *   - done {string}: Status "true" oder "false"
 *   - dueDate {string}: Fälligkeitsdatum im ISO-Format oder leer
 */
function renderTodos(todos) {
    const container = document.getElementById("todo-block");
    if (!container) return;

    if (todos.length === 0) {
        container.innerHTML = "<p>Keine Todos gefunden. Füge in den Fächern welche hinzu!</p>";
        return;
    }
    container.innerHTML = "";
    let iterator = 1;
    for (const t of todos) {
        if (t.done === "false"){
            const ts = t.dueDate ? new Date(t.dueDate).getTime() : NaN;
            const dateStr = Number.isFinite(ts) ? new Date(ts).toLocaleString("de-DE",{dateStyle:"medium", timeStyle:"short"}) : "—";
            const remaining = Number.isFinite(ts) ? calculateRemaining(ts) : "—";

            const div = document.createElement("div");
            div.className = "todo";
            div.id = `todo-${iterator}`; // fürs Scrollen von der Timeline

            if (t.prio === "niedrig") prioColor = "prio-niedrig";
            else if (t.prio === "mittel") prioColor = "prio-mittel";
            else if (t.prio === "hoch") prioColor = "prio-hoch";
            else prioColor = "";

            div.innerHTML = `
            <span class="todo-nr">${iterator}:</span>
            <span class="todo-name">${t.text}</span>
            <span class="${prioColor}">${t.prio}</span>
            <span class="todo-deadline">${dateStr}</span>
            <span class="todo-remaining">${remaining}</span>
            `;
            container.appendChild(div);
            iterator = iterator + 1;
        }
    }
}

/**
 * Parst ein deutsches Datumsformat "TT.MM.JJJJ" in ein Date-Objekt.
 * @param {string} dateStr - Datumsstring im deutschen Format
 * @returns {Date|null} Parsed Date oder null bei ungültigem Format
 */
function parseGermanDate(dateStr) {
    if (!dateStr) return null;

    const parts = dateStr.split(".");
    if (parts.length !== 3) return null;

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (!day || !month || !year) return null;

    //Monat -1 weil JS Monate 0-basiert speichert
    return new Date(year, month - 1, day);
}

/**
 * Berechnet die verbleibende Zeit bis zum gegebenen Timestamp.
 * @param {number} deadlineTs - Timestamp der Deadline in Millisekunden
 * @returns {string} Verbleibende Zeit im Format "Xd Xh Xm" oder "abgelaufen"
 */
function calculateRemaining(deadlineTs) {
    const diff = deadlineTs - Date.now();
    if (diff <= 0) return "abgelaufen";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    return `${days}d ${hours}h ${mins}m`;
}

/**
 * Rendert die Timeline mit Markern für alle Todos.
 * @param {Array<Object>} todos - Array von Todo-Objekten
 */
function renderTimeline(todos) {
    const markersHost = document.getElementById("tl-markers");
    if (!markersHost) return;

    markersHost.innerHTML = "";
    const now = Date.now();

    const items = todos
        .map(t => {
            return {
                ...t,
                ts: t.dueDate ? new Date(t.dueDate).getTime() : NaN
            };
        })
        .filter(t => Number.isFinite(t.ts));

    if (items.length === 0) return;

    const maxTs = Math.max(...items.map(t => t.ts), now + 1);
    const future = items.filter(t => t.ts >= now).sort((a, b) => a.ts - b.ts);
    const nextNr = future.length ? future[0].nr : null;

    const t = document.getElementById("time-span-end");
    if (t) t.textContent = new Date(maxTs).toLocaleString("de-DE");

    let iterator = 1;
    for (const t of items) {
        const pos = (t.ts - now) / (maxTs - now);
        const leftPct = Math.max(0, Math.min(1, pos)) * 100;

        const m = document.createElement("div");
        m.className = "tl-marker" + (iterator === nextNr ? " next" : "");
        m.style.left = `${leftPct}%`;
        m.textContent = iterator;

        const dateStr = new Date(t.ts).toLocaleString("de-DE");
        m.title = `Todo ${iterator}: ${t.name}\nDeadline: ${dateStr}`;

        m.addEventListener("click", () => {
            const el = document.getElementById(`todo-${iterator}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        markersHost.appendChild(m);
        iterator = iterator + 1;
    }
}

/**
 * Aktualisiert die aktuelle Uhrzeit im DOM.
 */
function tickTime() {
    const t = document.getElementById("time-span");
    if (t) t.textContent = new Date().toLocaleString("de-DE");
}

/**
 * Lädt alle Todos aller Subjects für den aktuellen Benutzer aus dem Backend.
 * @returns {Promise<Array<Object>|undefined>} Array von Todos mit Feld "subject" oder undefined bei Fehler
 */
async function loadAllTodos() {
    try {
        const res = await fetch('/api/subjects');
        if (!res.ok) {
            console.error("Fehler beim Laden der Todos:", await res.text());
            return;
        }
        
        const subjects = await res.json();
        //alle todos aus den subjects extrahieren und nach dueDate sortieren
        const allTodos = subjects.flatMap(s => s.todos.map(t => ({ ...t, subject: s.name })));
        allTodos.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        return allTodos;
    } catch (err) {
        console.error("Fehler beim Laden der Todos:", err);
    }
}

//Intervall zum regelmäßigen Aktualisieren der Todos und der Timeline
setInterval(async () => {
    renderTodos(await loadAllTodos());
    renderTimeline(await loadAllTodos());
}, 60_000);

//Intervall zum Aktualisieren der aktuellen Uhrzeit
setInterval(tickTime, 1000);

// Initiales Laden der Seite
document.addEventListener('DOMContentLoaded', async () => {
    const allTodos = await loadAllTodos();
    renderTodos(allTodos);
    renderTimeline(allTodos);
    tickTime();
});