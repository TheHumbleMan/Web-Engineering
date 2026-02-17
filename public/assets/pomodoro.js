let duration = 25 * 60; // 25 Minuten
    let remaining = duration;
    let timer = null;

    const timeEl = document.getElementById("pomo-time");

    function updateDisplay() {
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        timeEl.textContent =
        String(min).padStart(2, "0") + ":" +
        String(sec).padStart(2, "0");
    }

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

    document.getElementById("pause").onclick = () => {
        clearInterval(timer);
        timer = null;
    };

    document.getElementById("reset").onclick = () => {
        clearInterval(timer);
        timer = null;
        remaining = duration;
        updateDisplay();
    };

    updateDisplay();