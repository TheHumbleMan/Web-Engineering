const intitialButton = document.getElementById("inBtn");
const form = document.getElementById("addSubjectForm");

inBtn.addEventListener("click", () => {
    form.classList.toggle("hidden");
        if (!form.classList.contains("hidden")) {
            form.querySelector("input").focus();
        }
    inBtn.style.display = "none";
});