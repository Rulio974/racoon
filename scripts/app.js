(function () {
  function initMobileMenu() {
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

    burgerBtn.addEventListener("click", function () {
      setMenuState(!mobileMenu.classList.contains("is-open"));
    });
    mobileBackdrop.addEventListener("click", function () { setMenuState(false); });
    mobileLinks.forEach(function (link) {
      link.addEventListener("click", function () { setMenuState(false); });
    });
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenuState(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 720) setMenuState(false);
    });
  }

  function initReveal(reduceMotion) {
    if (reduceMotion) {
      document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    const observed = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("in");
      });
    }, { threshold: 0.16 });
    observed.forEach(function (el) { observer.observe(el); });
  }

  function initAirsoftTrails(reduceMotion) {
    if (reduceMotion) return;
    const section = document.getElementById("activites");
    if (!section) return;

    let layer = section.querySelector(".airsoft-trails");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "airsoft-trails";
      layer.setAttribute("aria-hidden", "true");
      section.appendChild(layer);
    }

    const mobileQuery = window.matchMedia("(max-width: 980px)");
    let timerId = 0;

    function rand(min, max) { return Math.random() * (max - min) + min; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function spawnTrail() {
      if (document.hidden) return;
      const width = section.clientWidth;
      const height = section.clientHeight;
      if (!width || !height) return;
      if (layer.childElementCount > 8) return;

      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -26 : width + 26;
      const endX = fromLeft ? width + 36 : -36;
      const startY = rand(height * 0.12, height * 0.9);
      const endY = clamp(startY + rand(-height * 0.32, height * 0.32), 14, height - 14);
      const midX = (startX + endX) * 0.5 + rand(-width * 0.06, width * 0.06);
      const midY = clamp(Math.min(startY, endY) - rand(height * 0.05, height * 0.22), 8, height - 8);
      const size = rand(4.2, 7.2);
      const duration = rand(1180, 1980) * (mobileQuery.matches ? 1.12 : 1);

      const bb = document.createElement("span");
      bb.className = "airsoft-bb";
      bb.style.width = size.toFixed(2) + "px";
      bb.style.height = size.toFixed(2) + "px";
      layer.appendChild(bb);

      const anim = bb.animate([
        { transform: "translate(" + startX.toFixed(2) + "px, " + startY.toFixed(2) + "px) scale(0.82)", opacity: 0 },
        { transform: "translate(" + midX.toFixed(2) + "px, " + midY.toFixed(2) + "px) scale(1)", opacity: 0.82, offset: 0.45 },
        { transform: "translate(" + endX.toFixed(2) + "px, " + endY.toFixed(2) + "px) scale(0.86)", opacity: 0 },
      ], {
        duration: duration,
        easing: "cubic-bezier(0.22, 0.74, 0.22, 1)",
        fill: "forwards",
      });

      anim.onfinish = function () {
        if (bb.parentNode) bb.parentNode.removeChild(bb);
      };
    }

    function scheduleNext() {
      spawnTrail();
      timerId = window.setTimeout(scheduleNext, mobileQuery.matches ? rand(760, 1320) : rand(520, 980));
    }

    scheduleNext();
    window.addEventListener("beforeunload", function () {
      if (timerId) window.clearTimeout(timerId);
    });
  }

  function initEyes() {
    const wrap = document.getElementById("logoWrap");
    if (!wrap) return;
    const svg = wrap.querySelector("svg");
    if (!svg) return;
    const stage = wrap.closest(".stage");
    const hero = wrap.closest(".hero");

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = reduceMotionQuery.matches;
    reduceMotionQuery.addEventListener("change", function (event) { reduceMotion = event.matches; });

    const mobileAutoQuery = window.matchMedia("(max-width: 980px)");
    let mobileAutoMode = mobileAutoQuery.matches;
    mobileAutoQuery.addEventListener("change", function (event) { mobileAutoMode = event.matches; });

    const ellipses = Array.from(svg.querySelectorAll("ellipse"));
    const pupils = ellipses
      .map(function (el) {
        const bbox = el.getBBox();
        const ctm = el.getCTM();
        const scaleArea = ctm ? Math.abs((ctm.a * ctm.d) - (ctm.b * ctm.c)) : 0;
        return { el: el, area: bbox.width * bbox.height * scaleArea };
      })
      .sort(function (a, b) { return b.area - a.area; })
      .slice(0, 2)
      .map(function (item) { return item.el; })
      .sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });

    if (pupils.length < 2) return;
    pupils.forEach(function (p) { p.classList.add("pupil"); });

    function rand(min, max) { return Math.random() * (max - min) + min; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function lerp(a, b, t) { return a + ((b - a) * t); }
    function now() { return performance.now(); }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    const state = {
      pointer: { nx: 0, ny: 0, active: false, proximity: 0, distanceNorm: 1 },
      goal: { x: 0, y: 0 },
      impulse: { x: 0, y: 0 },
      mobileSide: Math.random() < 0.5 ? -1 : 1,
      mobileTarget: { x: rand(-0.9, 0.9), y: rand(-0.65, 0.65) },
      nextMobileShiftAt: now() + rand(620, 1450),
      mobilePulse: { x: 0, y: 0 },
      blink: { value: 0, active: false, startAt: 0, duration: 150, nextAt: now() + rand(2400, 6200) },
      lastInputAt: now(),
      intro: {
        active: true,
        startAt: 0,
        duration: reduceMotion ? 520 : 1650,
        scale: reduceMotion ? 1.08 : 4.8,
        extraTilt: 0,
        extraY: 0,
        pulse: 0,
      },
    };

    if (hero) {
      hero.classList.add("is-intro");
      hero.classList.remove("intro-done");
    }

    const eyeRigs = pupils.map(function (el, index) {
      return { el: el, side: index === 0 ? -1 : 1, x: 0, y: 0, vx: 0, vy: 0, speed: 0, rx: 18, ry: 10 };
    });

    function updateRigFromLayout() {
      const r = wrap.getBoundingClientRect();
      const baseRadiusX = r.width * 0.024;
      const baseRadiusY = r.height * 0.017;
      eyeRigs.forEach(function (rig) {
        rig.rx = clamp(baseRadiusX, 9, 28);
        rig.ry = clamp(baseRadiusY, 6, 17);
      });
    }

    function clampToEllipse(x, y, rx, ry) {
      const nx = x / rx;
      const ny = y / ry;
      const d = Math.sqrt((nx * nx) + (ny * ny));
      if (d <= 1) return { x: x, y: y };
      return { x: x / d, y: y / d };
    }

    function introSaccadeTrack(p) {
      // Keyframes for sharp gaze snaps with short holds.
      const frames = [
        { t: 0.00, x: 0, hold: true },
        { t: 0.12, x: 0, hold: true },
        { t: 0.25, x: -1.62, hold: false },
        { t: 0.33, x: -1.62, hold: true },
        { t: 0.48, x: 1.66, hold: false },
        { t: 0.56, x: 1.66, hold: true },
        { t: 0.68, x: -1.08, hold: false },
        { t: 0.80, x: 0, hold: false },
        { t: 1.00, x: 0, hold: true },
      ];

      for (let i = 0; i < frames.length - 1; i += 1) {
        const a = frames[i];
        const b = frames[i + 1];
        if (p < a.t || p > b.t) continue;
        const local = clamp((p - a.t) / Math.max(0.0001, b.t - a.t), 0, 1);
        if (a.hold || b.hold) {
          return { x: lerp(a.x, b.x, local), pulse: 0 };
        }
        const eased = easeOutCubic(local);
        const x = lerp(a.x, b.x, eased);
        const direction = Math.sign(b.x - a.x) || 1;
        const pulse = Math.sin(local * Math.PI) * 1.0 * direction;
        return { x: x, pulse: pulse };
      }
      return { x: 0, pulse: 0 };
    }

    function updateGoal(t) {
      const sec = t * 0.001;
      const mobileMode = mobileAutoMode && !reduceMotion;

      if (state.intro.active) {
        if (!state.intro.startAt) state.intro.startAt = t;
        const introElapsed = t - state.intro.startAt;
        const p = clamp(introElapsed / state.intro.duration, 0, 1);

        if (reduceMotion) {
          const settle = easeOutCubic(p);
          state.goal.x = Math.sin(sec * 1.7) * 0.16 * (1 - settle);
          state.goal.y = Math.cos(sec * 1.05) * 0.05 * (1 - settle);
          state.intro.scale = lerp(1.08, 1, settle);
          state.intro.extraTilt = (1 - settle) * 0.12;
          state.intro.extraY = lerp(4, 0, settle);
          state.intro.pulse = 0;
        } else {
          const enter = clamp(p / 0.24, 0, 1);
          const settle = clamp((p - 0.79) / 0.21, 0, 1);
          const enterEase = easeOutCubic(enter);
          const settleEase = easeInOutCubic(settle);
          const track = introSaccadeTrack(p);
          state.goal.x = track.x * (1 - (settle * 0.72));
          state.goal.y = Math.sin((p * Math.PI * 2.2) + 0.5) * 0.045 * (1 - settle);
          state.intro.scale = p < 0.79 ? lerp(4.8, 1.38, enterEase) : lerp(1.38, 1, settleEase);
          state.intro.extraTilt = track.x * 0.16 * (1 - settle);
          state.intro.extraY = p < 0.79 ? lerp(7, 1.5, enterEase) : lerp(1.5, 0, settleEase);
          state.intro.pulse = track.pulse;
        }

        state.pointer.active = false;
        state.pointer.proximity = 0;
        state.pointer.distanceNorm = 1;

        if (p >= 1) {
          state.intro.active = false;
          state.intro.scale = 1;
          state.intro.extraTilt = 0;
          state.intro.extraY = 0;
          if (hero) {
            hero.classList.remove("is-intro");
            hero.classList.add("intro-done");
          }
        }
        return;
      }

      if (mobileMode) {
        if (t >= state.nextMobileShiftAt) {
          const alternate = Math.random() < 0.82 ? -1 : 1;
          state.mobileSide = state.mobileSide * alternate;
          state.mobileTarget.x = state.mobileSide * rand(0.72, 1.08);
          state.mobileTarget.y = rand(-0.18, 0.12);
          state.mobilePulse.x = rand(-0.22, 0.22);
          state.mobilePulse.y = rand(-0.08, 0.08);
          state.nextMobileShiftAt = t + rand(520, 1450);
        }
        state.mobilePulse.x *= 0.92;
        state.mobilePulse.y *= 0.9;
        const driftX = Math.sin(sec * 0.84) * 0.12 + Math.sin(sec * 1.56 + 0.9) * 0.08;
        const driftY = Math.sin(sec * 0.54) * 0.1 + Math.cos(sec * 1.02 + 1.7) * 0.05;
        state.pointer.nx += ((state.mobileTarget.x + state.mobilePulse.x + driftX) - state.pointer.nx) * 0.082;
        state.pointer.ny += ((state.mobileTarget.y + state.mobilePulse.y + driftY) - state.pointer.ny) * 0.058;
        state.pointer.active = true;
        state.pointer.proximity = 1;
        state.pointer.distanceNorm = 0;
      }

      const idleX = Math.sin(sec * 0.68) * 0.75 + Math.sin(sec * 1.11 + 1.3) * 0.35;
      const idleY = Math.sin(sec * 0.77) * 0.55 + Math.sin(sec * 1.37 + 0.5) * 0.22;
      const hoverBoost = state.pointer.active ? (mobileMode ? 1.22 : 0.92 + (state.pointer.proximity * 0.18)) : 0.82;
      const pointerWeight = state.pointer.active ? (mobileMode ? 0.97 : 0.18 + (state.pointer.proximity * 0.74)) : 0.08;
      const idleWeight = 1 - pointerWeight;
      const reduceMul = reduceMotion ? 0.35 : (mobileMode ? 1.15 : 1);

      state.goal.x = ((idleX * 0.62 * idleWeight) + (state.pointer.nx * 1.05 * pointerWeight)) * hoverBoost * reduceMul;
      state.goal.y = ((idleY * 0.42 * idleWeight) + (state.pointer.ny * 0.92 * pointerWeight)) * hoverBoost * reduceMul;
    }

    function updateBlink(t) {
      if (!state.blink.active && t >= state.blink.nextAt) {
        state.blink.active = true;
        state.blink.startAt = t;
        state.blink.duration = reduceMotion ? 110 : 150 + rand(-18, 16);
      }
      if (!state.blink.active) return;
      const p = clamp((t - state.blink.startAt) / state.blink.duration, 0, 1);
      state.blink.value = clamp(p < 0.48 ? p / 0.48 : (1 - p) / 0.52, 0, 1);
      if (p >= 1) {
        state.blink.active = false;
        state.blink.value = 0;
        state.blink.nextAt = t + rand(2400, 6200);
      }
    }

    function updatePhysics(dt, t) {
      const sec = t * 0.001;
      const mobileMode = mobileAutoMode && !reduceMotion;
      const responsiveness = state.intro.active ? 0.97 : (mobileMode ? 0.98 : (state.pointer.active ? (0.25 + (state.pointer.proximity * 0.75)) : 0.2));
      const stiffness = lerp(36, 102, responsiveness);
      const damping = lerp(22, 13, responsiveness);
      const saccadeChance = state.intro.active ? 0 : (mobileMode ? 0.0059 : 0.0028);

      if (!reduceMotion && Math.random() < saccadeChance) {
        const amp = state.pointer.active ? 0.22 : 0.32;
        state.impulse.x += rand(-1, 1) * amp;
        state.impulse.y += rand(-1, 1) * amp * 0.8;
      }
      state.impulse.x *= 0.88;
      state.impulse.y *= 0.88;

      eyeRigs.forEach(function (rig, index) {
        const parallax = rig.side * 0.08;
        const trackX = (state.goal.x + parallax + state.impulse.x) * rig.rx;
        const trackY = (state.goal.y + state.impulse.y) * rig.ry;
        const springX = (trackX - rig.x) * stiffness;
        const springY = (trackY - rig.y) * stiffness;
        const damperX = rig.vx * damping;
        const damperY = rig.vy * damping;
        const flutterX = (reduceMotion || state.intro.active) ? 0 : Math.sin(sec * (1.8 + index * 0.24) + index) * 0.35;
        const flutterY = (reduceMotion || state.intro.active) ? 0 : Math.cos(sec * (1.55 + index * 0.3) + index) * 0.26;
        rig.vx += ((springX - damperX + flutterX) * dt);
        rig.vy += ((springY - damperY + flutterY) * dt);
        rig.x += rig.vx * dt;
        rig.y += rig.vy * dt;
        const limited = clampToEllipse(rig.x, rig.y, rig.rx, rig.ry);
        rig.x = limited.x;
        rig.y = limited.y;
        rig.speed = Math.hypot(rig.vx, rig.vy);
      });
    }

    function render(t) {
      const sec = t * 0.001;
      const blinkScaleY = 1 - (state.blink.value * (reduceMotion ? 0.7 : 0.9));
      eyeRigs.forEach(function (rig) {
        const offsetY = state.blink.value * -1.3;
        const blinkStretchX = 1 + (state.blink.value * 0.16);
        const pulseAbs = Math.abs(state.intro.pulse);
        const direction = Math.sign(state.intro.pulse) || 1;
        const impulseStretchX = state.intro.active ? 1 + (pulseAbs * 0.42) : 1;
        const impulseStretchY = state.intro.active ? 1 - (pulseAbs * 0.24) : 1;
        const impulseSkew = state.intro.active ? direction * pulseAbs * 4.2 : 0;
        const scaleX = blinkStretchX * impulseStretchX;
        const scaleY = blinkScaleY * impulseStretchY;
        const motionBlur = (!reduceMotion && state.intro.active) ? pulseAbs * 1.25 : 0;
        rig.el.style.transform = "translate(" + rig.x.toFixed(2) + "px, " + (rig.y + offsetY).toFixed(2) + "px) scale(" + scaleX.toFixed(3) + ", " + scaleY.toFixed(3) + ")";
        rig.el.style.filter = motionBlur > 0.03 ? "blur(" + motionBlur.toFixed(2) + "px)" : "none";
        rig.el.style.transform += impulseSkew !== 0 ? " skewX(" + impulseSkew.toFixed(2) + "deg)" : "";
      });
      const headAmp = reduceMotion ? 0.22 : 0.34;
      const distHead = 0.64 + (state.pointer.proximity * 0.18);
      const introHeadMul = state.intro.active ? 0.28 : 1;
      const bobX = (Math.sin(sec * 0.41) * 0.75 + state.goal.x * 0.68) * headAmp * distHead * introHeadMul;
      const bobY = (Math.sin(sec * 0.71 + 0.6) * 0.95 + state.goal.y * 0.82) * headAmp * distHead * introHeadMul;
      const tilt = ((state.goal.x * 0.26) + (Math.sin(sec * 0.34) * 0.16) + state.intro.extraTilt) * headAmp * introHeadMul;
      const breath = 1 + (Math.sin(sec * 0.29) * 0.008 * headAmp);
      const introScale = state.intro.active ? state.intro.scale : 1;
      const introY = state.intro.active ? state.intro.extraY : 0;
      svg.style.transform = "translate(" + bobX.toFixed(2) + "px, " + (bobY + introY).toFixed(2) + "px) rotate(" + tilt.toFixed(2) + "deg) scale(" + (breath * introScale).toFixed(4) + ")";
      if (stage) {
        stage.style.filter = state.intro.active ? "contrast(1.04) saturate(1.04)" : "";
      }
    }

    function setPointerFromEvent(event) {
      if (mobileAutoMode || state.intro.active) return;
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + (rect.width / 2);
      const cy = rect.top + (rect.height / 2);
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const nx = dx / (window.innerWidth * 0.45);
      const ny = dy / (window.innerHeight * 0.45);
      const distance = Math.hypot(dx, dy);
      const maxDistance = Math.hypot(window.innerWidth, window.innerHeight) * 0.75;
      state.pointer.nx = clamp(nx, -1, 1);
      state.pointer.ny = clamp(ny, -1, 1);
      state.pointer.distanceNorm = clamp(distance / maxDistance, 0, 1);
      state.pointer.proximity = 1 - state.pointer.distanceNorm;
      state.pointer.active = true;
      state.lastInputAt = now();
    }

    window.addEventListener("pointermove", function (event) {
      if (mobileAutoMode || state.intro.active) return;
      setPointerFromEvent(event);
    });
    window.addEventListener("pointerleave", function () {
      if (mobileAutoMode || state.intro.active) return;
      state.pointer.active = false;
    });
    window.addEventListener("click", function (event) {
      if (mobileAutoMode || state.intro.active) return;
      setPointerFromEvent(event);
      state.impulse.x += state.pointer.nx * 0.36;
      state.impulse.y += state.pointer.ny * 0.28;
    });

    updateRigFromLayout();
    window.addEventListener("resize", updateRigFromLayout, { passive: true });

    let last = now();
    let rafId = 0;
    function tick(t) {
      const dt = Math.min((t - last) / 1000, 1 / 30);
      last = t;
      if (!document.hidden) {
        updateGoal(t);
        updateBlink(t);
        updatePhysics(dt, t);
        render(t);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    window.addEventListener("beforeunload", function () { cancelAnimationFrame(rafId); });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  initMobileMenu();
  initReveal(reduceMotion);
  initAirsoftTrails(reduceMotion);
  initEyes();
})();
