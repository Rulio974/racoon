export async function initEyes() {
  const wrap = document.getElementById("logoWrap");
  if (!wrap) return;

  const response = await fetch("./Groupe.svg");
  if (!response.ok) {
    wrap.insertAdjacentHTML("beforeend", "<p style='color:#d98f8f;font-size:0.95rem;'>Erreur: impossible de charger le logo.</p>");
    return;
  }

  const raw = await response.text();
  wrap.innerHTML = raw;

  const svg = wrap.querySelector("svg");
  if (!svg) return;

  const motionTokens = {
    stiffnessNear: 102,
    stiffnessFar: 36,
    dampingNear: 13,
    dampingFar: 22,
    maxIdleAmpX: 0.62,
    maxIdleAmpY: 0.42,
    pointerAmpX: 1.05,
    pointerAmpY: 0.92,
    saccadeChance: 0.0028,
    blinkMinMs: 2400,
    blinkMaxMs: 6200,
    blinkDurationMs: 150,
    recoverMs: 420,
    inactiveMs: 1800,
  };

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = reduceMotionQuery.matches;
  reduceMotionQuery.addEventListener("change", (event) => {
    reduceMotion = event.matches;
  });

  const mobileAutoQuery = window.matchMedia("(max-width: 980px)");
  let mobileAutoMode = mobileAutoQuery.matches;
  mobileAutoQuery.addEventListener("change", (event) => {
    mobileAutoMode = event.matches;
  });

  const ellipses = [...svg.querySelectorAll("ellipse")];
  const pupils = ellipses
    .map((el) => ({
      el,
      area: (() => {
        const bbox = el.getBBox();
        const ctm = el.getCTM();
        if (!ctm) return 0;
        const scaleArea = Math.abs((ctm.a * ctm.d) - (ctm.b * ctm.c));
        return bbox.width * bbox.height * scaleArea;
      })(),
    }))
    .sort((a, b) => b.area - a.area)
    .slice(0, 2)
    .map((item) => item.el)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

  if (pupils.length < 2) {
    wrap.insertAdjacentHTML("beforeend", "<p style='color:#d98f8f;font-size:0.95rem;'>Erreur: pupilles non trouvees.</p>");
    return;
  }

  pupils.forEach((p) => p.classList.add("pupil"));

  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + ((b - a) * t);
  const now = () => performance.now();

  const gaze = {
    mode: "idle",
    pointer: { nx: 0, ny: 0, active: false, proximity: 0, distanceNorm: 1 },
    goal: { x: 0, y: 0 },
    impulse: { x: 0, y: 0 },
    idleSeed: { ax: rand(0, Math.PI * 2), ay: rand(0, Math.PI * 2) },
    mobileSide: Math.random() < 0.5 ? -1 : 1,
    mobileTarget: { x: rand(-0.9, 0.9), y: rand(-0.65, 0.65) },
    nextMobileShiftAt: now() + rand(620, 1450),
    mobilePulse: { x: 0, y: 0 },
    focusUntil: 0,
    recoverUntil: 0,
    lastInputAt: now(),
    nextBlinkAt: now() + rand(motionTokens.blinkMinMs, motionTokens.blinkMaxMs),
    blink: { value: 0, active: false, startAt: 0, duration: motionTokens.blinkDurationMs, doublePending: false },
  };

  const eyeRigs = pupils.map((el, index) => ({
    el,
    side: index === 0 ? -1 : 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rx: 18,
    ry: 10,
  }));

  function updateRigFromLayout() {
    const logoRect = wrap.getBoundingClientRect();
    const baseRadiusX = logoRect.width * 0.024;
    const baseRadiusY = logoRect.height * 0.017;
    eyeRigs.forEach((rig) => {
      rig.rx = clamp(baseRadiusX, 9, 28);
      rig.ry = clamp(baseRadiusY, 6, 17);
    });
  }

  function clampToEllipse(x, y, rx, ry) {
    const nx = x / rx;
    const ny = y / ry;
    const d = Math.sqrt((nx * nx) + (ny * ny));
    if (d <= 1) return { x, y };
    return { x: x / d, y: y / d };
  }

  function setMode(next, t) {
    gaze.mode = next;
    if (next === "recover") gaze.recoverUntil = t + motionTokens.recoverMs;
  }

  function scheduleBlink(t) {
    gaze.nextBlinkAt = t + rand(motionTokens.blinkMinMs, motionTokens.blinkMaxMs);
  }

  function startBlink(t) {
    gaze.blink.active = true;
    gaze.blink.startAt = t;
    gaze.blink.duration = reduceMotion ? 110 : motionTokens.blinkDurationMs + rand(-18, 16);
  }

  function updateBlink(t) {
    if (!gaze.blink.active && t >= gaze.nextBlinkAt) startBlink(t);
    if (!gaze.blink.active) return;

    const p = clamp((t - gaze.blink.startAt) / gaze.blink.duration, 0, 1);
    const closeOpen = p < 0.48 ? p / 0.48 : (1 - p) / 0.52;
    gaze.blink.value = clamp(closeOpen, 0, 1);

    if (p >= 1) {
      gaze.blink.active = false;
      gaze.blink.value = 0;
      if (!gaze.blink.doublePending && Math.random() < 0.22 && !reduceMotion) {
        gaze.blink.doublePending = true;
        gaze.nextBlinkAt = t + rand(85, 150);
      } else {
        gaze.blink.doublePending = false;
        scheduleBlink(t);
      }
    }
  }

  function updateGoal(t) {
    const sec = t * 0.001;
    const mobileMode = mobileAutoMode && !reduceMotion;

    if (mobileMode) {
      if (t >= gaze.nextMobileShiftAt) {
        const alternate = Math.random() < 0.82 ? -1 : 1;
        gaze.mobileSide = gaze.mobileSide * alternate;
        gaze.mobileTarget.x = gaze.mobileSide * rand(0.72, 1.08);
        gaze.mobileTarget.y = rand(-0.18, 0.12);
        gaze.mobilePulse.x = rand(-0.22, 0.22);
        gaze.mobilePulse.y = rand(-0.08, 0.08);
        gaze.nextMobileShiftAt = t + rand(520, 1450);
      }

      gaze.mobilePulse.x *= 0.92;
      gaze.mobilePulse.y *= 0.9;

      const driftX = Math.sin(sec * 0.84 + gaze.idleSeed.ax) * 0.12 + Math.sin(sec * 1.56 + 0.9) * 0.08;
      const driftY = Math.sin(sec * 0.54 + gaze.idleSeed.ay) * 0.1 + Math.cos(sec * 1.02 + 1.7) * 0.05;

      const targetX = gaze.mobileTarget.x + gaze.mobilePulse.x + driftX;
      const targetY = gaze.mobileTarget.y + gaze.mobilePulse.y + driftY;

      gaze.pointer.nx += (targetX - gaze.pointer.nx) * 0.082;
      gaze.pointer.ny += (targetY - gaze.pointer.ny) * 0.058;
      gaze.pointer.active = true;
      gaze.pointer.proximity = 1;
      gaze.pointer.distanceNorm = 0;
      gaze.lastInputAt = t;

      if (gaze.mode !== "focus" && gaze.mode !== "tracking") setMode("tracking", t);
    }

    const idleX =
      Math.sin(sec * 0.68 + gaze.idleSeed.ax) * 0.75 +
      Math.sin(sec * 1.11 + 1.3) * 0.35 +
      Math.sin(sec * 0.19 + 2.0) * 0.2;
    const idleY =
      Math.sin(sec * 0.77 + gaze.idleSeed.ay) * 0.55 +
      Math.sin(sec * 1.37 + 0.5) * 0.22;

    const hoverBoost = gaze.pointer.active ? (mobileMode ? 1.22 : 0.92 + (gaze.pointer.proximity * 0.18)) : 0.82;
    const pointerWeight = gaze.pointer.active ? (mobileMode ? 0.97 : 0.18 + (gaze.pointer.proximity * 0.74)) : 0.08;
    const idleWeight = 1 - pointerWeight;
    const stateWeight = gaze.mode === "focus" ? 1.35 : gaze.mode === "tracking" ? 1 : 0.86;
    const reduceMul = reduceMotion ? 0.35 : (mobileMode ? 1.15 : 1);

    gaze.goal.x =
      ((idleX * motionTokens.maxIdleAmpX * idleWeight) + (gaze.pointer.nx * motionTokens.pointerAmpX * pointerWeight)) *
      hoverBoost *
      stateWeight *
      reduceMul;
    gaze.goal.y =
      ((idleY * motionTokens.maxIdleAmpY * idleWeight) + (gaze.pointer.ny * motionTokens.pointerAmpY * pointerWeight)) *
      hoverBoost *
      stateWeight *
      reduceMul;
  }

  function updateState(t) {
    if (gaze.mode === "focus" && t > gaze.focusUntil) {
      setMode("recover", t);
    } else if (gaze.mode === "recover" && t > gaze.recoverUntil) {
      setMode(gaze.pointer.active ? "tracking" : "idle", t);
    } else if (t - gaze.lastInputAt > motionTokens.inactiveMs && gaze.mode === "tracking") {
      setMode("recover", t);
    } else if (gaze.pointer.active && gaze.mode === "idle") {
      setMode("tracking", t);
    }
  }

  function updatePhysics(dt, t) {
    const sec = t * 0.001;
    const mobileMode = mobileAutoMode && !reduceMotion;
    const responsiveness = mobileMode ? 0.98 : (gaze.pointer.active ? (0.25 + (gaze.pointer.proximity * 0.75)) : 0.2);
    const stiffness = lerp(motionTokens.stiffnessFar, motionTokens.stiffnessNear, responsiveness);
    const damping = lerp(motionTokens.dampingFar, motionTokens.dampingNear, responsiveness);

    const saccadeChance = mobileMode ? motionTokens.saccadeChance * 2.1 : motionTokens.saccadeChance;
    if (!reduceMotion && Math.random() < saccadeChance && gaze.mode !== "focus") {
      const amp = gaze.pointer.active ? 0.22 : 0.32;
      gaze.impulse.x += rand(-1, 1) * amp;
      gaze.impulse.y += rand(-1, 1) * amp * 0.8;
    }

    gaze.impulse.x *= 0.88;
    gaze.impulse.y *= 0.88;

    eyeRigs.forEach((rig, index) => {
      const parallax = rig.side * 0.08;
      const trackX = (gaze.goal.x + parallax + gaze.impulse.x) * rig.rx;
      const trackY = (gaze.goal.y + gaze.impulse.y) * rig.ry;

      const springX = (trackX - rig.x) * stiffness;
      const springY = (trackY - rig.y) * stiffness;
      const damperX = rig.vx * damping;
      const damperY = rig.vy * damping;

      const flutterX = reduceMotion ? 0 : Math.sin(sec * (1.8 + index * 0.24) + index) * 0.35;
      const flutterY = reduceMotion ? 0 : Math.cos(sec * (1.55 + index * 0.3) + index) * 0.26;

      rig.vx += ((springX - damperX + flutterX) * dt);
      rig.vy += ((springY - damperY + flutterY) * dt);
      rig.x += rig.vx * dt;
      rig.y += rig.vy * dt;

      const limited = clampToEllipse(rig.x, rig.y, rig.rx, rig.ry);
      rig.x = limited.x;
      rig.y = limited.y;
    });
  }

  function render(t) {
    const sec = t * 0.001;
    const blinkScaleY = 1 - (gaze.blink.value * (reduceMotion ? 0.7 : 0.9));

    eyeRigs.forEach((rig) => {
      const offsetY = gaze.blink.value * -1.3;
      const stretchX = 1 + (gaze.blink.value * 0.16);
      rig.el.style.transform = `translate(${rig.x.toFixed(2)}px, ${(rig.y + offsetY).toFixed(2)}px) scale(${stretchX.toFixed(3)}, ${blinkScaleY.toFixed(3)})`;
    });

    const headAmp = reduceMotion ? 0.45 : 1;
    const distHead = 0.82 + (gaze.pointer.proximity * 0.34);
    const bobX = (Math.sin(sec * 0.41) * 1.6 + gaze.goal.x * 2.1) * headAmp * distHead;
    const bobY = (Math.sin(sec * 0.71 + 0.6) * 2.2 + gaze.goal.y * 2.2) * headAmp * distHead;
    const tilt = (gaze.goal.x * 1.15 + Math.sin(sec * 0.34) * 0.5) * headAmp;
    const breath = 1 + (Math.sin(sec * 0.29) * 0.008 * headAmp);
    svg.style.transform = `translate(${bobX.toFixed(2)}px, ${bobY.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) scale(${breath.toFixed(4)})`;
  }

  let rafId = 0;
  let lastTime = now();
  function tick(t) {
    const dt = Math.min((t - lastTime) / 1000, 1 / 30);
    lastTime = t;

    if (document.hidden) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    updateState(t);
    updateGoal(t);
    updateBlink(t);
    updatePhysics(dt, t);
    render(t);
    rafId = requestAnimationFrame(tick);
  }

  function setPointerFromEvent(event) {
    if (mobileAutoMode) return;
    const rect = wrap.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const nx = dx / (window.innerWidth * 0.45);
    const ny = dy / (window.innerHeight * 0.45);
    const distance = Math.hypot(dx, dy);
    const maxDistance = Math.hypot(window.innerWidth, window.innerHeight) * 0.75;
    const distanceNorm = clamp(distance / maxDistance, 0, 1);
    const proximity = 1 - distanceNorm;

    gaze.pointer.nx = clamp(nx, -1, 1);
    gaze.pointer.ny = clamp(ny, -1, 1);
    gaze.pointer.distanceNorm = distanceNorm;
    gaze.pointer.proximity = proximity;
    gaze.lastInputAt = now();
  }

  window.addEventListener("pointermove", (event) => {
    if (mobileAutoMode) return;
    gaze.pointer.active = true;
    setPointerFromEvent(event);
    if (gaze.mode !== "focus") setMode("tracking", now());
  });

  window.addEventListener("pointerleave", () => {
    if (mobileAutoMode) return;
    gaze.pointer.active = false;
    gaze.lastInputAt = now();
    if (gaze.mode !== "focus") setMode("recover", now());
  });

  window.addEventListener("click", (event) => {
    if (mobileAutoMode) return;
    setPointerFromEvent(event);
    gaze.impulse.x += gaze.pointer.nx * 0.36;
    gaze.impulse.y += gaze.pointer.ny * 0.28;
    gaze.focusUntil = now() + (reduceMotion ? 220 : 520);
    setMode("focus", now());
  });

  window.addEventListener("resize", updateRigFromLayout, { passive: true });
  updateRigFromLayout();
  rafId = requestAnimationFrame(tick);

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(rafId);
  });
}
