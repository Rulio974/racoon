export function initMobileMenu() {
  const burgerBtn = document.getElementById("burgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileBackdrop = document.getElementById("mobileBackdrop");
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll("a") : [];

  function setMenuState(open) {
    if (!mobileMenu || !burgerBtn) return;
    mobileMenu.classList.toggle("is-open", open);
    burgerBtn.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    burgerBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (!burgerBtn || !mobileMenu || !mobileBackdrop) return;

  burgerBtn.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.contains("is-open");
    setMenuState(!isOpen);
  });

  mobileBackdrop.addEventListener("click", () => setMenuState(false));

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuState(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) setMenuState(false);
  });
}
