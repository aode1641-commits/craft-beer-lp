const deck = document.querySelector(".slides");
const slides = [...document.querySelectorAll(".slide")];
const dots = [...document.querySelectorAll(".dot")];
const currentSlide = document.querySelector("#current-slide");
const heroVideo = document.querySelector(".hero-video");
const soundToggle = document.querySelector("[data-sound-toggle]");
let activeIndex = 0;
let wheelLocked = false;
let soundEnabled = true;
let audioFadeFrame = 0;
const AUDIO_FADE_DURATION = 900;

heroVideo?.addEventListener("canplay", () => {
  heroVideo.classList.add("is-loaded");
  startHeroVideo();
});

const startHeroVideo = (allowAudio = false) => {
  if (!heroVideo) return;
  if (allowAudio && soundEnabled && activeIndex === 0) heroVideo.muted = false;
  const playAttempt = heroVideo.play();
  playAttempt?.catch(() => {
    // Keep the visual experience working when autoplay with sound is blocked.
    heroVideo.muted = true;
    heroVideo.play().catch(() => {});
  });
};

const fadeHeroVolume = (targetVolume, duration = AUDIO_FADE_DURATION) => {
  if (!heroVideo) return;
  window.cancelAnimationFrame(audioFadeFrame);
  const startVolume = heroVideo.volume;
  const startTime = performance.now();
  const change = targetVolume - startVolume;

  if (duration <= 0 || Math.abs(change) < 0.01) {
    heroVideo.volume = targetVolume;
    return;
  }

  const animate = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    heroVideo.volume = startVolume + change * progress;
    if (progress < 1) audioFadeFrame = window.requestAnimationFrame(animate);
  };
  audioFadeFrame = window.requestAnimationFrame(animate);
};

const syncHeroAudio = (previousIndex, nextIndex) => {
  if (!heroVideo || previousIndex === nextIndex) return;
  if (nextIndex === 0 && soundEnabled) {
    window.cancelAnimationFrame(audioFadeFrame);
    heroVideo.volume = 1;
    heroVideo.muted = false;
    startHeroVideo(true);
  } else if (previousIndex === 0) {
    window.cancelAnimationFrame(audioFadeFrame);
    heroVideo.volume = 0;
    heroVideo.muted = true;
    heroVideo.pause();
  }
};

const updateSoundToggle = () => {
  if (!soundToggle) return;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.setAttribute("aria-label", soundEnabled ? "音声をオフにする" : "音声をオンにする");
  const label = soundToggle.querySelector(".sound-label");
  if (label) label.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
};

soundToggle?.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  updateSoundToggle();
  if (soundEnabled && activeIndex === 0) {
    heroVideo.muted = false;
    startHeroVideo(true);
    fadeHeroVolume(1, 350);
  } else if (!soundEnabled) {
    fadeHeroVolume(0, 450);
  }
});

document.addEventListener(
  "pointerdown",
  () => {
    if (activeIndex === 0 && soundEnabled) startHeroVideo(true);
  },
  { passive: true },
);

const setActiveSlide = (index) => {
  const previousIndex = activeIndex;
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));
  currentSlide.textContent = String(activeIndex + 1).padStart(2, "0");
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });
  dots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeIndex;
    dot.classList.toggle("is-active", isActive);
    if (isActive) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
  syncHeroAudio(previousIndex, activeIndex);
};

const canScrollWithinSlide = (slide, direction) => {
  // Every page is intentionally fixed to one viewport. There is no nested
  // vertical scroll to consume the wheel or swipe gesture.
  return false;
};

const goToSlide = (index) => {
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  if (activeIndex === 0 && soundEnabled) startHeroVideo(true);
  setActiveSlide(nextIndex);
  deck?.scrollTo({
    left: nextIndex * deck.clientWidth,
    behavior: "smooth",
  });
};

dots.forEach((dot) => {
  dot.addEventListener("click", () => goToSlide(Number(dot.dataset.slide)));
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        setActiveSlide(Number(entry.target.dataset.index));
      }
    });
  },
  { root: deck, threshold: 0.58 },
);

slides.forEach((slide) => observer.observe(slide));
if (heroVideo) {
  heroVideo.volume = 1;
  heroVideo.muted = false;
  startHeroVideo();
}
updateSoundToggle();
setActiveSlide(0);

deck.addEventListener(
  "wheel",
  (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 8) return;
    const direction = delta > 0 ? 1 : -1;
    event.preventDefault();
    if (wheelLocked) return;
    wheelLocked = true;
    goToSlide(activeIndex + direction);
    window.setTimeout(() => {
      wheelLocked = false;
    }, 720);
  },
  { passive: false },
);

document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) || event.target.isContentEditable) return;
  if (["ArrowDown", "PageDown", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    goToSlide(activeIndex + 1);
  }
  if (["ArrowUp", "PageUp", "ArrowLeft"].includes(event.key)) {
    event.preventDefault();
    goToSlide(activeIndex - 1);
  }
  if (event.key === "Home") {
    event.preventDefault();
    goToSlide(0);
  }
  if (event.key === "End") {
    event.preventDefault();
    goToSlide(slides.length - 1);
  }
});

let touchStartX = 0;
let touchStartY = 0;
deck.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
  },
  { passive: true },
);

deck.addEventListener(
  "touchend",
  (event) => {
    const distanceX = touchStartX - event.changedTouches[0].screenX;
    const distanceY = touchStartY - event.changedTouches[0].screenY;
    if (Math.abs(distanceX) < 55 || Math.abs(distanceX) < Math.abs(distanceY)) return;
    const direction = distanceX > 0 ? 1 : -1;
    goToSlide(activeIndex + direction);
  },
  { passive: true },
);
