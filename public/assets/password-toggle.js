/**
 * @file password-toggle.js
 * @description JavaScript für das Passwort-Toggle-Feature auf der Login/Registrierungsseite.
 * Ermöglicht das Anzeigen/Verbergen von Passwörtern in Eingabefeldern.
 */

/**
 * Initialisiert alle Passwort-Toggle-Buttons auf der Seite.
 *
 * Diese Funktion sucht nach allen Elementen mit dem Attribut `data-password-toggle`,
 * das die ID eines Passwort-Inputs referenziert.
 * Für jeden Button wird ein Klick-Event hinzugefügt, das den zugehörigen Input
 * zwischen "password" und "text" wechselt und die Beschriftung sowie das ARIA-Label
 * entsprechend anpasst.
 *
 * Beispiel HTML:
 * <input id="pass" type="password">
 * <button data-password-toggle="pass">Anzeigen</button>
 *
 * @function
 * @returns {void} Diese IIFE gibt nichts zurück, sondern initialisiert nur Event-Handler.
 */
(() => {
    const toggleButtons = document.querySelectorAll("[data-password-toggle]");
    if (!toggleButtons.length) return;

    toggleButtons.forEach((button) => {
        const targetId = button.getAttribute("data-password-toggle");
        if (!targetId) return;

        const input = document.getElementById(targetId);
        if (!input) return;

        /**
         * Event-Handler für das Umschalten des Passwort-Inputs.
         * Wechselt den Input-Typ zwischen "password" und "text", passt den Button-Text
         * und das ARIA-Label an.
         *
         * @event click
         * @returns {void}
         */
        button.addEventListener("click", () => {
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "Verbergen" : "Anzeigen";
            button.setAttribute("aria-label", isPassword ? "Passwort verbergen" : "Passwort anzeigen");
        });
    });
})();
