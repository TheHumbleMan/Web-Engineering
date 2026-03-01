/**
 * @file theme.js
 * @description JavaScript für die Theme-Verwaltung der Lernhilfe-WebApp.
 * Ermöglicht das Umschalten zwischen Dark- und Light-Mode.
 */

/**
 * Script für Dark/Light-Mode Umschaltung
 * 
 * Dieses IIFE verwaltet die Darstellung der Seite im Dark- oder Light-Mode:
 * - Prüft zuerst, ob ein Benutzerwert im localStorage gespeichert ist
 * - Falls nicht, wird die Systemeinstellung (prefers-color-scheme) verwendet
 * - Setzt die Klasse "dark" auf den Body entsprechend
 * - Synchronisiert den Zustand mit einem Toggle-Checkbox-Element
 * - Speichert Änderungen des Users wieder im localStorage
 */
(() => {
    /** 
     * Toggle-Checkbox für den Theme-Wechsel
     * @type {HTMLInputElement | null} 
     */
    const toggle = document.querySelector('#toggle');
    
    /** 
     * Schlüsselname für localStorage
     * @type {string} 
     */
    const KEY = 'theme';

    if (!toggle) return;

    /** 
     * Gespeicherter Wert aus localStorage (dark oder light)
     * @type {string | null} 
     */
    const saved = localStorage.getItem(KEY);

    /** 
     * Systempräferenz für Dark-Mode
     * @type {boolean} 
     */
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;

    /** 
     * Aktueller Zustand des Dark-Modes
     * @type {boolean} 
     */
    const isDark = saved ? saved === 'dark' : systemDark;

    // Setze die Klasse auf den Body und den Toggle-Status entsprechend
    document.body.classList.toggle('dark', isDark);
    toggle.checked = isDark;

    /**
     * Event-Listener für Änderung der Toggle-Checkbox
     * 
     * Aktualisiert Body-Klasse und speichert den neuen Zustand im localStorage
     */
    toggle.addEventListener('change', () => {
        const shouldBeDark = toggle.checked;
        document.body.classList.toggle('dark', shouldBeDark);
        localStorage.setItem(KEY, shouldBeDark ? 'dark' : 'light');
    });
})();