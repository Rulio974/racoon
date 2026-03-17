import { initMobileMenu } from "./menu.js";
import { initReveal } from "./reveal.js";
import { initEyes } from "./eyes.js";

initMobileMenu();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
initReveal({ reduceMotion });

initEyes().catch(() => {
  const wrap = document.getElementById("logoWrap");
  if (wrap) {
    wrap.insertAdjacentHTML("beforeend", "<p style='color:#d98f8f;font-size:0.95rem;'>Erreur: animation indisponible.</p>");
  }
});
