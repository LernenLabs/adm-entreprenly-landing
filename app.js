"use strict";

/**
 * Entreprenly landing — interactivity only.
 *
 * The markup lives in index.html (base text in English) and copy lives in the
 * i18n/*.json files. This script wires up theme, language, mobile menus and the
 * pricing toggle, and swaps text based on the selected language.
 */

const STORAGE_KEYS = {
  theme: "entreprenly.theme",
  language: "entreprenly.language",
};

const SUPPORTED_LANGUAGES = ["en", "es"];
const DEFAULT_LANGUAGE = "en";
const DEFAULT_THEME = "light";

// Login and sign up always point to the main application.
const APP_BASE_URL = "https://daop.entreprenly.online";

const themeAssetSources = [
  "./assets/brand-icon.png",
  "./assets/brand-icon-light.png",
  "./assets/brand-logo-transparent.png",
  "./assets/brand-logo-light-transparent.png",
];

const themeIcons = {
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true"><path d="M20.3 14.4A8.5 8.5 0 0 1 9.6 3.7 7 7 0 1 0 20.3 14.4z"></path></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg>`,
};

const state = {
  theme: readPreference(STORAGE_KEYS.theme, DEFAULT_THEME, ["light", "dark"]),
  language: readPreference(STORAGE_KEYS.language, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES),
  billingCycle: "monthly",
  menuOpen: false,
  languageMenuOpen: false,
};

let dict = {};
let themeTransitionTimer;
let themeFadeAnimation;

/* ─── Preferences ─────────────────────────────────────────────────────────── */

function readPreference(key, fallback, allowedValues) {
  try {
    const stored = window.localStorage.getItem(key);
    return allowedValues.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function persistPreference(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences remain usable during the current session even if storage is blocked.
  }
}

function preloadThemeAssets() {
  if (typeof Image === "undefined") {
    return;
  }
  themeAssetSources.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

/* ─── Translations ────────────────────────────────────────────────────────── */

function tr(key) {
  return (dict && Object.prototype.hasOwnProperty.call(dict, key)) ? dict[key] : key;
}

async function loadDictionary(language) {
  try {
    const response = await fetch(`./i18n/${language}.json`, { cache: "no-cache" });
    if (response.ok) {
      dict = await response.json();
    }
  } catch {
    // If the dictionary cannot be loaded we keep whatever text is already in the DOM.
  }
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", tr(el.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", tr(el.dataset.i18nTitle));
  });
}

/* ─── Rendering helpers ───────────────────────────────────────────────────── */

function updateThemeButtons() {
  const isDark = state.theme === "dark";
  const labelKey = isDark ? "theme.toLight" : "theme.toDark";
  const svg = isDark ? themeIcons.sun : themeIcons.moon;

  document.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
    button.dataset.i18nAria = labelKey;
    button.dataset.i18nTitle = labelKey;
    button.innerHTML = `${svg}<span class="sr-only" data-i18n="${labelKey}"></span>`;
  });
}

function updateLanguageButtons() {
  document.querySelectorAll('[data-action="set-language"]').forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateBilling() {
  const monthly = state.billingCycle === "monthly";

  document.querySelectorAll("[data-price]").forEach((el) => {
    el.textContent = monthly ? el.dataset.priceMonthly : el.dataset.priceAnnual;
  });
  document.querySelectorAll("[data-cycle-label]").forEach((el) => {
    el.dataset.i18n = monthly ? "plans.monthlyLabel" : "plans.annualLabel";
  });
  document.querySelectorAll("[data-cycle-note]").forEach((el) => {
    el.dataset.i18n = monthly ? el.dataset.noteMonthly : el.dataset.noteAnnual;
  });
  document.querySelectorAll('[data-action="set-landing-billing"]').forEach((button) => {
    button.classList.toggle("is-active", button.dataset.cycle === state.billingCycle);
  });
}

function updateFavicon() {
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) {
    const href = state.theme === "dark" ? "./assets/brand-icon.png" : "./assets/brand-icon-light.png";
    if (favicon.getAttribute("href") !== href) {
      favicon.setAttribute("href", href);
    }
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;

  const shell = document.querySelector(".theme-shell");
  if (shell) {
    shell.classList.toggle("theme-dark", state.theme === "dark");
    shell.classList.toggle("theme-light", state.theme !== "dark");
  }

  const logoSrc = state.theme === "dark"
    ? "./assets/brand-logo-transparent.png"
    : "./assets/brand-logo-light-transparent.png";
  document.querySelectorAll("img[data-brand-logo]").forEach((image) => {
    if (image.getAttribute("src") !== logoSrc) {
      image.setAttribute("src", logoSrc);
    }
  });

  updateFavicon();
}

function syncPanels() {
  const menu = document.querySelector("[data-mobile-menu]");
  const languagePanel = document.querySelector("[data-mobile-language]");
  if (menu) menu.hidden = !state.menuOpen;
  if (languagePanel) languagePanel.hidden = !state.languageMenuOpen;

  document.querySelectorAll('[data-action="toggle-menu"]').forEach((button) => {
    button.setAttribute("aria-expanded", String(state.menuOpen));
  });
  document.querySelectorAll('[data-action="toggle-language-menu"]').forEach((button) => {
    button.setAttribute("aria-expanded", String(state.languageMenuOpen));
    button.classList.toggle("is-active", state.languageMenuOpen);
  });
}

/** Re-apply everything that depends on state (theme buttons, billing, copy). */
function refresh() {
  updateThemeButtons();
  updateLanguageButtons();
  updateBilling();
  applyTranslations();
}

/* ─── Theme transition effect ─────────────────────────────────────────────── */

function themeFadeColor(theme) {
  return theme === "dark" ? "#0c0f12" : "#fffdf8";
}

function getThemeFadeLayer() {
  let layer = document.querySelector("[data-theme-fade-layer]");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "theme-fade-layer";
    layer.dataset.themeFadeLayer = "";
    document.body.appendChild(layer);
  }
  return layer;
}

function suppressThemeTransitions() {
  const shell = document.querySelector(".theme-shell");
  if (!shell) {
    return;
  }
  window.clearTimeout(themeTransitionTimer);
  shell.classList.add("theme-no-transitions");
  themeTransitionTimer = window.setTimeout(() => {
    shell.classList.remove("theme-no-transitions");
  }, 120);
}

function beginThemeTransition(nextTheme) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const layer = getThemeFadeLayer();
  layer.style.backgroundColor = themeFadeColor(nextTheme);
  layer.style.display = "block";

  if (themeFadeAnimation) {
    themeFadeAnimation.cancel();
  }

  if (!layer.animate) {
    layer.style.opacity = "0.16";
    window.setTimeout(() => {
      layer.style.opacity = "0";
      layer.style.display = "none";
    }, 160);
    return;
  }

  themeFadeAnimation = layer.animate(
    [{ opacity: 0 }, { opacity: 0.18, offset: 0.32 }, { opacity: 0 }],
    { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "both" }
  );

  themeFadeAnimation.onfinish = () => {
    layer.style.display = "none";
  };
}

/* ─── Actions ─────────────────────────────────────────────────────────────── */

function toggleTheme() {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  suppressThemeTransitions();
  beginThemeTransition(nextTheme);
  state.theme = nextTheme;
  persistPreference(STORAGE_KEYS.theme, state.theme);
  applyTheme();
  updateThemeButtons();
  applyTranslations();
}

async function setLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language) || language === state.language) {
    closeMobilePanels();
    return;
  }
  state.language = language;
  document.documentElement.lang = language;
  persistPreference(STORAGE_KEYS.language, state.language);
  closeMobilePanels();
  await loadDictionary(language);
  refresh();
}

function closeMobilePanels() {
  state.menuOpen = false;
  state.languageMenuOpen = false;
  syncPanels();
}

/* ─── Event wiring ────────────────────────────────────────────────────────── */

document.addEventListener("click", (event) => {
  const navLink = event.target.closest("[data-nav-link]");
  if (navLink && (state.menuOpen || state.languageMenuOpen)) {
    closeMobilePanels();
  }

  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) {
    return;
  }

  event.preventDefault();
  const action = actionElement.dataset.action;

  if (action === "toggle-menu") {
    state.menuOpen = !state.menuOpen;
    state.languageMenuOpen = false;
    syncPanels();
    return;
  }

  if (action === "toggle-language-menu") {
    state.languageMenuOpen = !state.languageMenuOpen;
    state.menuOpen = false;
    syncPanels();
    return;
  }

  if (action === "toggle-theme") {
    toggleTheme();
    return;
  }

  if (action === "set-language") {
    setLanguage(actionElement.dataset.language);
    return;
  }

  if (action === "set-landing-billing") {
    state.billingCycle = actionElement.dataset.cycle === "annual" ? "annual" : "monthly";
    updateBilling();
    applyTranslations();
    return;
  }
});

/* ─── Init ────────────────────────────────────────────────────────────────── */

(async function init() {
  document.documentElement.lang = state.language;
  applyTheme();
  syncPanels();

  const currentYear = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = currentYear;
  });

  preloadThemeAssets();
  await loadDictionary(state.language);
  refresh();
})();
