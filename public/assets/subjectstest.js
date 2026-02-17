document.addEventListener("DOMContentLoaded", () => {

    const user = { name: "Christian Hartmann" };

    const subjects = [
        { name: "Mathematik" },
        { name: "Informatik" },
        { name: "Physik" },
        { name: "Web Engineering" },
        { name: "Datenbanken" }
    ];

    // Name setzen
    const headline = document.querySelector(".top-banner h1");
    headline.textContent = "Hallo " + user.name;

    // Container
    const container = document.querySelector(".gridAddon");

    // statische subjects entfernen falls vorhanden
    document.querySelectorAll(".subject").forEach(el => el.remove());

    // Subjects rendern
    subjects.forEach(subject => addSubjectToDom(subject.name));

    // Button
    const createBtn = document.querySelector(".top-banner button");
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

createBtn.addEventListener("click", () => {

    const subjectName = prompt("Bitte Namen für das neue Fach eingeben:");

    // Abbruch oder leerer String
    if (!subjectName || subjectName.trim() === "") {
        alert("Ungültiger Name!");
        return;
    }

    const newSubject = {
        name: subjectName.trim()
    };

    subjects.push(newSubject);

    const subjectDiv = document.createElement("div");
    subjectDiv.classList.add("subject");

    const title = document.createElement("h2");
    title.textContent = newSubject.name;

    subjectDiv.appendChild(title);
    container.appendChild(subjectDiv);
});
