// ======================================
// Часы
// ======================================

const clock = document.getElementById("clock");

if (clock) {
  function updateClock() {
    const now = new Date();

    clock.textContent = now.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// ======================================
// Слайдер
// ======================================

document.querySelectorAll(".slider").forEach((slider) => {
  const slides = slider.querySelector(".slides");
  const slideItems = slider.querySelectorAll(".slide");
  const dots = slider.querySelectorAll(".dot");
  const next = slider.querySelector(".slider__btn--next");
  const prev = slider.querySelector(".slider__btn--prev");

  if (!slides || !next || !prev) return;

  let current = 0;
  let interval;

  const totalSlides = slideItems.length;
  const AUTO_PLAY_DELAY = 4000;

  function updateSlider() {
    slides.style.transform = `translateX(-${current * 100}%)`;

    dots.forEach((dot) => dot.classList.remove("active"));

    if (dots[current]) {
      dots[current].classList.add("active");
    }
  }

  function nextSlide() {
    current = (current + 1) % totalSlides;
    updateSlider();
  }

  function prevSlide() {
    current = (current - 1 + totalSlides) % totalSlides;
    updateSlider();
  }

  function stopAutoplay() {
    clearInterval(interval);
  }

  function startAutoplay() {
    stopAutoplay();
    interval = setInterval(nextSlide, AUTO_PLAY_DELAY);
  }

  next.addEventListener("click", () => {
    nextSlide();
    startAutoplay();
  });

  prev.addEventListener("click", () => {
    prevSlide();
    startAutoplay();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      current = index;

      updateSlider();

      startAutoplay();
    });
  });

  if (!window.matchMedia("(pointer: coarse)").matches) {
    slider.addEventListener("mouseenter", stopAutoplay);

    slider.addEventListener("mouseleave", startAutoplay);
  }

  updateSlider();

  startAutoplay();
});

// ======================================
// Курсор "Изучить кейс"
// ======================================

const project = document.getElementById("ling-case");

if (project) {

    const cursorLabel = document.createElement("div");

    cursorLabel.className = "cursor-label";
    cursorLabel.textContent = "Изучить кейс";

    document.body.appendChild(cursorLabel);

    let mouseX = 0;
    let mouseY = 0;

    let x = 0;
    let y = 0;

    let isHover = false;

    function animateCursor() {

        if (isHover) {

            x += (mouseX - x) * 0.18;
            y += (mouseY - y) * 0.18;

            cursorLabel.style.left = x + "px";
            cursorLabel.style.top = y + "px";
        }

        requestAnimationFrame(animateCursor);
    }

    animateCursor();

    project.addEventListener("mouseenter", (e) => {

        isHover = true;

        mouseX = x = e.clientX;
        mouseY = y = e.clientY;

        cursorLabel.classList.add("active");

    });

    project.addEventListener("mousemove", (e) => {

        mouseX = e.clientX + 24;
        mouseY = e.clientY + 24;

    });

    project.addEventListener("mouseleave", () => {

        isHover = false;
        cursorLabel.classList.remove("active");

    });

}

// Кейс загружается из существующей страницы: текст редактируется в ling.html.
const caseDialog = document.getElementById("case-dialog");
const caseTrigger = document.querySelector(".case-trigger");
if (caseDialog && caseTrigger && typeof caseDialog.showModal === "function") {
  const body = document.getElementById("case-dialog-body");
  const close = caseDialog.querySelector(".case-dialog__close");
  let request;
  let loaded = false;
  let backdropStart = false;

  async function loadCase() {
    if (loaded) return;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    body.setAttribute("aria-busy", "true");
    body.innerHTML = '<p class="case-dialog__status" role="status">Загружаем кейс…</p>';
    try {
      const response = await fetch(caseTrigger.href, { signal: controller.signal, cache: "no-cache" });
      if (!response.ok) throw new Error("Case unavailable");
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      const hero = page.querySelector(".hero");
      const content = page.querySelector(".case-content");
      if (!hero || !content) throw new Error("Case content missing");
      if (request !== controller || !caseDialog.open) return;
      const banner = page.querySelector(".ui-design");
      body.replaceChildren(...[hero, banner, content].filter(Boolean));
      loaded = true;
    } catch (error) {
      if (request !== controller || !caseDialog.open) return;
      body.innerHTML = '<div class="case-dialog__status" role="alert"><p>Не удалось загрузить кейс. Проверьте подключение и попробуйте ещё раз.</p><button type="button" class="case-dialog__retry">Повторить</button><a href="ling.html">Открыть отдельной страницей</a></div>';
      body.querySelector("button").addEventListener("click", loadCase);
    } finally {
      clearTimeout(timeout);
      if (request === controller) body.setAttribute("aria-busy", "false");
    }
  }

  caseTrigger.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    caseDialog.showModal();
    document.documentElement.classList.add("case-open");
    body.scrollTop = 0;
    loadCase();
  });
  close.addEventListener("click", () => caseDialog.close());
  caseDialog.addEventListener("pointerdown", (event) => {
    backdropStart = event.target === caseDialog;
  });
  caseDialog.addEventListener("click", (event) => {
    if (backdropStart && event.target === caseDialog) caseDialog.close();
    backdropStart = false;
  });
  caseDialog.addEventListener("close", () => {
    request?.abort();
    document.documentElement.classList.remove("case-open");
    caseTrigger.focus({ preventScroll: true });
  });
}
