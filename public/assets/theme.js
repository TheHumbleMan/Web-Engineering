(() => {
    const toggle = document.querySelector('#dark-mode-switch input[type="checkbox"]');
    const themeLink = document.querySelector('#theme-style');
    const KEY = 'theme';

    if (!toggle || !themeLink) return;

    const apply = (isDark) => {
        // Hier wird der Pfad zur CSS-Datei getauscht
        const newHref = isDark ? '/assets/dark.css' : '/assets/light.css';
        themeLink.setAttribute('href', newHref);

        // Optional: Klasse am Body trotzdem lassen, falls du CSS-Logik darauf stützt
        document.body.classList.toggle('dark', isDark);
    };

    const saved = localStorage.getItem(KEY);
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Logik: Erst schauen, ob was gespeichert ist, sonst System-Standard
    const isDark = saved ? (saved === 'dark') : systemDark;

    // Initial anwenden
    apply(isDark);
    toggle.checked = isDark;

    toggle.addEventListener('change', () => {
        const shouldBeDark = toggle.checked;
        apply(shouldBeDark);
        localStorage.setItem(KEY, shouldBeDark ? 'dark' : 'light');
    });
})();