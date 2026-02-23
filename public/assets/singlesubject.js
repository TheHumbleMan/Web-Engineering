/**
 * Sobald die Seite erstmals gerendert wurde, werden sämtliche
 * Einträge ins Prüfungsdatum, Note, oder den Notiz block im localStorage
 * zwischengespeichert
 */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("examDate").addEventListener("change", updateLocalStorage);
    document.getElementById("grade").addEventListener("input", updateLocalStorage);
    document.getElementById("note-textarea").addEventListener("input", updateLocalStorage);
})

/**
 * Speichern knopf: die aktell im localStorage gespeicherten daten werden
 * in die Serverseitige JSON überführt
 */
const saveBtn = document.getElementById("saveSubjectBtn");
saveBtn.addEventListener("click", async () => {
    updateLocalStorage()
    const subjectId = window.location.pathname.split("/").pop();
    const subjectData = JSON.parse(localStorage.getItem(subjectId));

    // POST an Backend
    const response = await fetch(`/subjects/${subjectId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData)
    });

    if (response.ok) {
        alert("Gespeichert!");
    } else {
        alert("Fehler beim Speichern!");
    }
});

/**
 * Neues Todo Button: das Popup zur todo erstellung wird sichtbar gemacht
 */
const addTodoBtn = document.getElementById("addTodo");
addTodoBtn.addEventListener("click", ()=> openPopup())
const todosContainer = document.getElementById("todos-container");
const popup = document.getElementById("todoPopup");

function openPopup() {
    popup.style.display = "block";
}
function closePopup() {
    popup.style.display = "none";
}

/**
 * Hilfsfunktion die basierend auf den Eingaben im Popup-fenster ein
 * entsprechendes Todo erstellt,rendert und in localStorage schreibt
 */
function submitTodo() {
    const todoID = `todo${Date.now()}`;
    const text = document.getElementById("todoName").value;
    const priority = document.getElementById("todoPriority").value;
    const isoDate = document.getElementById("todoDueDate").value;
    const dueDate = formatGermanDate(isoDate);

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
    updateLocalStorage();
}

/**
 * Hilffunction die die aktuell Sichtbaren eingaben in localStorage im gleichen
 * Format wie in der Serverseitigen JSON speichert
 */
function updateLocalStorage() {
    const subjectId = window.location.pathname.split("/").pop();
    const name = document.getElementById("name").innerText;
    const examDate = document.getElementById("examDate").value;
    const grade = document.getElementById("grade").value;
    const notes = document.getElementById("note-textarea").value;
    const todos = Array.from(document.querySelectorAll(".singletodo")).map(div => ({
        id : div.querySelector(".todo-text").dataset.id,
        text: div.querySelector(".todo-text").innerText,
        done: div.querySelector(".todo-text").dataset.done,
        prio: div.querySelector(".todo-text").dataset.prio,
        dueDate: div.querySelector(".todo-text").dataset.duedate,
    }));

    const subjectData = { subjectId, name, examDate, grade, notes, todos };
    localStorage.setItem(subjectId, JSON.stringify(subjectData));
}

/**
 * Hilfsfunktion die das datumsformat von xx-xx-xxx ins
 * deutsche format xx.xx.xxx ändert
 */
function formatGermanDate(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
}