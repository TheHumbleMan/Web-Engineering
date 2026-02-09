(() => {
    const toggle = document.querySelector('#toggle');
    const themeLink = document.querySelector('#theme-style');
    const KEY = 'theme';

    if (!toggle || !themeLink) return;

    const isSubjects = location.pathname.startsWith('/subjects');

    const css = isSubjects
        ? { dark: '/assets/subjectdark.css', light: '/assets/subjectlight.css' }
        : { dark: '/assets/dark.css',       light: '/assets/light.css' };

    const apply = (isDark) => {
        themeLink.href = isDark ? css.dark : css.light;
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
