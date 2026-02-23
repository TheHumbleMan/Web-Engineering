(() => {
    const toggle = document.querySelector('#toggle');
    const KEY = 'theme';
    if (!toggle) return;

    const saved = localStorage.getItem(KEY);
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : systemDark;

    document.body.classList.toggle('dark', isDark);
    toggle.checked = isDark;

    toggle.addEventListener('change', () => {
        const shouldBeDark = toggle.checked;
        document.body.classList.toggle('dark', shouldBeDark);
        localStorage.setItem(KEY, shouldBeDark ? 'dark' : 'light');
    });
})();