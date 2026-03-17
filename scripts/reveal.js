export function initReveal({ reduceMotion }) {
  if (reduceMotion) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in"));
    return;
  }

  const observed = document.querySelectorAll("[data-reveal]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      });
    },
    { threshold: 0.16 }
  );

  observed.forEach((el) => observer.observe(el));
}
