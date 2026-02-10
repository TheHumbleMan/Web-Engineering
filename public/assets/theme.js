(() => {
    const toggle = document.querySelector('#toggle');
    const themeLink = document.querySelector('#theme-style');
    const KEY = 'theme';
    if (!toggle || !themeLink) return;

    const THEME_SETS = {
        default: { dark: '/assets/dark.css',        light: '/assets/light.css' },
        subjects: { dark: '/assets/subjectdark.css', light: '/assets/subjectlight.css' },
    };

    const SUBJECTS_PREFIXES = [
        '/subjects',
        '/timer',
    ];

    const path = location.pathname;
    const set = SUBJECTS_PREFIXES.some(p => path.startsWith(p))
        ? THEME_SETS.subjects
        : THEME_SETS.default;

    const apply = (isDark) => {
        themeLink.href = isDark ? set.dark : set.light;
        document.body.classList.toggle('dark', isDark);
    };

    const saved = localStorage.getItem(KEY);
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : systemDark;

    apply(isDark);
    toggle.checked = isDark;

    toggle.addEventListener('change', () => {
        const shouldBeDark = toggle.checked;
        apply(shouldBeDark);
        localStorage.setItem(KEY, shouldBeDark ? 'dark' : 'light');
    });
})();
