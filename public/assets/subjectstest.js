document.addEventListener("DOMContentLoaded", () => {
    const subjects = [
        { name: "Mathematik" },
        { name: "Informatik" },
        { name: "Physik" },
        { name: "Web Engineering" },
        { name: "Datenbanken" }
    ];

    // Container
    const container = document.querySelector(".gridAddon");
    if (!container) return;

    // statische subjects entfernen falls vorhanden
    document.querySelectorAll(".subject").forEach(el => el.remove());

    // Subjects rendern
    subjects.forEach(subject => addSubjectToDom(subject.name));

    // Button
    const createBtn = document.querySelector(".top-banner button");
    if (createBtn) {
        createBtn.addEventListener("click", () => {
        const subjectName = prompt("Bitte Namen für das neue Fach eingeben:");

        if (!subjectName || subjectName.trim() === "") {
            alert("Ungültiger Name!");
            return;
        }

        const name = subjectName.trim();
        subjects.push({ name });

        addSubjectToDom(name);
        });
    }

    // Hilfsfunktion (damit Code nicht doppelt ist)
    function addSubjectToDom(name) {
        const subjectDiv = document.createElement("div");
        subjectDiv.classList.add("subject");

        const title = document.createElement("h2");
        title.textContent = name;

        subjectDiv.appendChild(title);
        container.appendChild(subjectDiv);
    }
});
