/**
 * @file pomodoro.js
 * @description JavaScript für den Pomodoro-Timer auf der Lernhilfe-WebApp.
 * Ermöglicht das Starten, Pausieren und Zurücksetzen des Timers.
 */

/**
 * Pomodoro Timer
 *
 * Ein einfacher Timer für die Pomodoro-Technik (25 Minuten Arbeitsintervall).
 * Enthält Start-, Pause- und Reset-Funktionen sowie die Anzeige der verbleibenden Zeit.
 */


/** 
 * Gesamtdauer des Timers in Sekunden (25 Minuten). 
 * @type {number}
 */
let duration = 25 * 60; // 25 Minuten

/** 
 * Verbleibende Zeit in Sekunden. 
 * @type {number}
 */
let remaining = duration;

/** 
 * Referenz auf das laufende Intervall. 
 * @type {number|null}
 */
let timer = null;

/** 
 * DOM-Element zur Anzeige der verbleibenden Zeit. 
 * @type {HTMLElement}
 */
const timeEl = document.getElementById("pomo-time");

/**
 * Aktualisiert die Anzeige des Timers.
 * Formatiert Minuten und Sekunden mit führenden Nullen.
 * @function
 * @returns {void}
 */
function updateDisplay() {
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    timeEl.textContent =
    String(min).padStart(2, "0") + ":" +
    String(sec).padStart(2, "0");
}

/**
 * Startet den Timer, falls er noch nicht läuft.
 * Verringert die verbleibende Zeit jede Sekunde.
 * Zeigt eine Benachrichtigung, wenn der Timer abgelaufen ist.
 */
document.getElementById("start").onclick = () => {
    if (timer) return;
    timer = setInterval(() => {
    if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
        alert("Pomodoro fertig");
        return;
    }
    remaining--;
    updateDisplay();
    }, 1000);
};

/**
 * Pausiert den Timer, ohne die verbleibende Zeit zurückzusetzen.
 */
document.getElementById("pause").onclick = () => {
    clearInterval(timer);
    timer = null;
};

/**
 * Setzt den Timer zurück auf die ursprüngliche Dauer und aktualisiert die Anzeige.
 */
document.getElementById("reset").onclick = () => {
    clearInterval(timer);
    timer = null;
    remaining = duration;
    updateDisplay();
};

// Initiale Anzeige beim Laden der Seite
updateDisplay();