/**
 * @file singlesubject.js
 * @description JavaScript für die Einzelsubject-Seite der Lernhilfe-WebApp.
 * Verwaltet die Anzeige und Speicherung von Prüfungsdatum, Notizen und Todos.
 */

/**
 * Script für SessionStorage-Synchronisierung und Todo-Management
 * 
 * Dieses Skript übernimmt:
 * - Zwischenspeicherung von Prüfungsdatum, Notizen und Todos im sessionStorage
 * - Übertragung der Daten per POST auf den Server
 * - Erstellung, Anzeige und Verwaltung von Todos inklusive Priorität und Fälligkeitsdatum
 * - Interaktive Checkboxen zum Abhaken von Todos
 */

/**
 * Event: DOMContentLoaded
 * 
 * Sobald die Seite vollständig geladen ist, werden Event-Listener für die Eingabefelder
 * "examDate" und "note-textarea" gesetzt, um Änderungen automatisch im sessionStorage zu speichern.
 */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("examDate").addEventListener("change", updateSessionStorage);
    document.getElementById("note-textarea").addEventListener("input", updateSessionStorage);
})

/**
 * Speichern-Button
 * 
 * Überträgt die aktuell im sessionStorage gespeicherten Daten in die Serverseitige JSON via POST.
 */
const saveBtn = document.getElementById("saveSubjectBtn");
saveBtn.addEventListener("click", async () => {
    updateSessionStorage()
    const subjectId = window.location.pathname.split("/").pop();
    const subjectData = JSON.parse(sessionStorage.getItem(subjectId));
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

    // POST an Backend
    const response = await fetch(`/subjects/${subjectId}/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify(subjectData)
    });

    if (response.ok) {
        alert("Gespeichert!");
    } else {
        alert("Fehler beim Speichern!");
    }
});


/**
 * Neues Todo erstellen
 * 
 * Öffnet das Popup-Fenster zur Erstellung eines neuen Todos.
 */
const addTodoBtn = document.getElementById("addTodo");
addTodoBtn.addEventListener("click", ()=> openPopup())

/** 
 * Container-Element für Todos
 * @type {HTMLElement} 
 */
const todosContainer = document.getElementById("todos-container");

/**
 * Popup-Fenster für Todo-Eingabe
 * @type {HTMLElement}
 */
const popup = document.getElementById("todoPopup");

/**
 * Öffnet das Popup-Fenster
 * @function
 * @returns {void}
 */
function openPopup() {
    popup.style.display = "block";
}

/**
 * Schließt das Popup-Fenster
 * @function
 * @returns {void}
 */
function closePopup() {
    popup.style.display = "none";
}

/**
 * Erstellt ein neues Todo basierend auf den Eingaben im Popup-Fenster,
 * rendert es im DOM und speichert es im sessionStorage.
 * 
 * @function
 * @returns {void}
 */
function submitTodo() {
    const todoID = `todo${Date.now()}`;
    const text = document.getElementById("todoName").value;
    const priority = document.getElementById("todoPriority").value;
    const dueDate = document.getElementById("todoDueDate").value;

    if(!text || !dueDate) return alert("Name und Datum müssen ausgefüllt sein!");

    let color;
    if(priority === "hoch") color = "red";
    else if(priority === "mittel") color = "yellow";
    else if(priority === "niedrig") color = "green";
    else color = "black";

    const div = document.createElement("div");
    div.classList.add("singletodo");
    div.innerHTML = `
        <input type="checkbox">
        <div class="todo-text" style="color:${color}"
            data-id=${todoID}
            data-done="false"
            data-prio=${priority}
            data-dueDate=${dueDate}>${text}
            </div>
        <div class="dueDate">Fällig: ${dueDate}</div>
    `;
    todosContainer.appendChild(div);
    closePopup();
    updateSessionStorage();
}


/**
 * Aktualisiert den sessionStorage mit allen aktuellen Eingaben
 * für ein Fach inklusive Todos.
 * 
 * @function
 * @returns {void}
 */
function updateSessionStorage() {
    const subjectId = window.location.pathname.split("/").pop();
    const name = document.getElementById("name").innerText;
    const examDate = document.getElementById("examDate").value;
    const notes = document.getElementById("note-textarea").value;
    const todos = Array.from(document.querySelectorAll(".singletodo")).map(div => ({
        id : div.querySelector(".todo-text").dataset.id,
        text: div.querySelector(".todo-text").innerText,
        done: div.querySelector(".todo-text").dataset.done,
        prio: div.querySelector(".todo-text").dataset.prio,
        dueDate: div.querySelector(".todo-text").dataset.duedate,
    }));

    const subjectData = { subjectId, name, examDate, notes, todos };
    sessionStorage.setItem(subjectId, JSON.stringify(subjectData));
}

/**
 * Event-Listener auf den Todos-Container
 * 
 * Toggelt den "done"-Status eines Todos, wenn eine Checkbox geändert wird,
 * und aktualisiert den sessionStorage.
 */
const container = document.getElementById("todos-container"); // Parent aller Todos
container.addEventListener("change", (e) => {
    if (!e.target.matches('input[type="checkbox"]')) {
        console.log("Nicht Checkbox, Ignoriere Event");
        return;
    }
    console.log("Checkbox geändert:", e.target.id, "Checked:", e.target.checked);
    const subjectId = window.location.pathname.split("/").pop();
    const checkbox = e.target;
    const todoId = checkbox.id.replace("checkbox-", "");

    // Todos aus sessionStorage holen
    const todos = JSON.parse(sessionStorage.getItem(subjectId))?.todos || [];

    // Passendes Todo finden
    const todo = todos.find(t => String(t.id) === todoId);
    if (!todo) {
        console.error("Todo nicht gefunden für ID:", todoId);
        return
    }

    console.log("Checkbox:" + checkbox)
    // done toggeln muss im DOM gemacht werden
    const todoTextElement = checkbox.nextElementSibling;
    console.log("Todo Text Element:", todoTextElement);
    const newDoneValue = todo.done === "false" ? "true" : "false";
    console.log("Neuer done Wert:", newDoneValue);
    todoTextElement.dataset.done = newDoneValue;

    updateSessionStorage();
});