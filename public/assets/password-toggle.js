(() => {
    const toggleButtons = document.querySelectorAll("[data-password-toggle]");
    if (!toggleButtons.length) return;

    toggleButtons.forEach((button) => {
        const targetId = button.getAttribute("data-password-toggle");
        if (!targetId) return;

        const input = document.getElementById(targetId);
        if (!input) return;

        button.addEventListener("click", () => {
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "Verbergen" : "Anzeigen";
            button.setAttribute("aria-label", isPassword ? "Passwort verbergen" : "Passwort anzeigen");
        });
    });
})();
