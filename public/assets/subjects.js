
/**
 * @file subjects.js
 * @description JavaScript für die Subjects-Seite der Lernhilfe-WebApp.
 * Verwaltet das Anzeigen und Hinzufügen neuer Fächer.
 */

/**
 * Script für das Anzeigen eines Formulars zum Hinzufügen eines neuen Fachs
 * 
 * Beim Klick auf den Initial-Button wird das Formular sichtbar gemacht,
 * der Fokus auf das erste Input-Feld gesetzt, und der Button selbst ausgeblendet.
 */

/** 
 * Button, der das Formular anzeigt
 * @type {HTMLElement}
 */
const intitialButton = document.getElementById("inBtn");

/** 
 * Formular zum Hinzufügen eines neuen Fachs
 * @type {HTMLElement}
 */
const form = document.getElementById("addSubjectForm");

/**
 * Klick-Event auf den Initial-Button
 * 
 * - Zeigt/versteckt das Formular per CSS-Klasse "hidden"
 * - Setzt den Fokus auf das erste Input-Feld im Formular
 * - Blendet den Initial-Button aus, wenn das Formular sichtbar wird
 */
inBtn.addEventListener("click", () => {
    form.classList.toggle("hidden");
        if (!form.classList.contains("hidden")) {
            form.querySelector("input").focus();
        }
    inBtn.style.display = "none";
});