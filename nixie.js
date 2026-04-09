const DIGITS_ALL = "0123456789".split("");

function pad2(n) {
  return String(n).padStart(2, "0");
}

/* Build DOM for one digit tube */
function createDigitTube(initialDigit) {
  const shell = el("div", "nixie-tube-shell");

  const rimTop = el("div", "nixie-tube-rim nixie-tube-rim--top");
  rimTop.setAttribute("aria-hidden", "true");

  const glass = el("div", "nixie-tube-glass");

  const vignette = ariaHidden(el("div", "nixie-tube-vignette"));
  const mesh     = ariaHidden(el("div", "nixie-tube-mesh"));
  const glow     = ariaHidden(el("div", "nixie-tube-inner-glow"));

  const stackChars = el("div", "nixie-stack-chars");

  const silhouettes = ariaHidden(el("div", "nixie-silhouettes"));
  updateSilhouettes(silhouettes, initialDigit);

  const bloom = ariaHidden(el("span", "nixie-bloom nixie-one-regular"));
  bloom.textContent = initialDigit;

  const faceClip = el("div", "nixie-face-clip");
  const face = el("span", "nixie-face nixie-one-regular");
  face.textContent = initialDigit;
  faceClip.appendChild(face);

  stackChars.append(silhouettes, bloom, faceClip);
  glass.append(vignette, mesh, glow, stackChars);

  const rimBottom = ariaHidden(el("div", "nixie-tube-rim nixie-tube-rim--bottom"));

  shell.append(rimTop, glass, rimBottom);
  return shell;
}

/* Build DOM for fixed tube (dot) */
function createDotTube() {
  const shell = el("div", "nixie-tube-shell");

  const rimTop = ariaHidden(el("div", "nixie-tube-rim nixie-tube-rim--top"));
  const glass  = el("div", "nixie-tube-glass");

  const vignette = ariaHidden(el("div", "nixie-tube-vignette"));
  const mesh     = ariaHidden(el("div", "nixie-tube-mesh"));
  const glow     = ariaHidden(el("div", "nixie-tube-inner-glow"));

  const stackChars = el("div", "nixie-stack-chars");

  const bloom = ariaHidden(el("span", "nixie-bloom nixie-one-regular"));
  bloom.textContent = ".";

  const faceClip = el("div", "nixie-face-clip");
  const face = el("span", "nixie-face nixie-face--dot nixie-one-regular");
  face.textContent = ".";
  faceClip.appendChild(face);

  stackChars.append(bloom, faceClip);
  glass.append(vignette, mesh, glow, stackChars);

  const rimBottom = ariaHidden(el("div", "nixie-tube-rim nixie-tube-rim--bottom"));

  shell.append(rimTop, glass, rimBottom);
  return shell;
}

/* Helpers */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function ariaHidden(node) {
  node.setAttribute("aria-hidden", "true");
  return node;
}

function updateSilhouettes(container, activeDigit) {
  container.innerHTML = "";
  DIGITS_ALL.filter(c => c !== activeDigit).forEach(c => {
    const s = el("span", "nixie-silhouette nixie-one-regular");
    s.textContent = c;
    container.appendChild(s);
  });
}

/* Jitter RAF */
function startJitter(stackCharsEl) {
  let frame = 0;
  let raf;
  const tick = () => {
    frame++;
    if (frame % 4 === 0) {
      const x = (Math.random() - 0.5) * 0.65;
      const y = (Math.random() - 0.5) * 0.5;
      const b = 0.93 + Math.random() * 0.1;
      stackCharsEl.style.transform = `translate3d(${x}px,${y}px,0)`;
      stackCharsEl.style.filter    = `brightness(${b})`;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/* Update digit (normal, animated) */
function updateTubeDigit(shell, newDigit) {
  const bloom       = shell.querySelector(".nixie-bloom");
  const silhouettes = shell.querySelector(".nixie-silhouettes");
  const faceClip    = shell.querySelector(".nixie-face-clip");
  const currentFace = faceClip.querySelector(".nixie-face:not(.nixie-face--exiting)");

  if (currentFace && currentFace.textContent === newDigit) return;

  if (bloom)       bloom.textContent = newDigit;
  if (silhouettes) updateSilhouettes(silhouettes, newDigit);

  // Exit animation on old digit
  if (currentFace) {
    const exitSpan = currentFace.cloneNode(true);
    exitSpan.classList.add("nixie-face--exiting");
    exitSpan.classList.remove("nixie-face--entering");
    faceClip.appendChild(exitSpan);
    exitSpan.addEventListener("animationend", () => exitSpan.remove(), { once: true });
  }

  // Animation on new digit
  if (currentFace) {
    currentFace.textContent = newDigit;
    currentFace.classList.remove("nixie-face--entering");
    void currentFace.offsetWidth;
    currentFace.classList.add("nixie-face--entering");
    currentFace.addEventListener("animationend", () => {
      currentFace.classList.remove("nixie-face--entering");
    }, { once: true });
  }
}

/* Chaos RAF (scramble on minute change) */
function startChaos(shell, endAt) {
  const faceClip = shell.querySelector(".nixie-face-clip");
  const bloom    = shell.querySelector(".nixie-bloom");

  faceClip.classList.add("nixie-face-clip--chaos");
  faceClip.innerHTML = `
    <span class="nixie-face-trail nixie-face-trail--deep  nixie-one-regular" aria-hidden></span>
    <span class="nixie-face-trail nixie-face-trail--mid   nixie-one-regular" aria-hidden></span>
    <span class="nixie-face-trail nixie-face-trail--near  nixie-one-regular" aria-hidden></span>
    <span class="nixie-face nixie-face--chaos-top nixie-one-regular"></span>
  `;

  const [deep, mid, near, face] = faceClip.children;
  let raf;
  let cur  = String(Math.floor(Math.random() * 10));
  const prev = [cur, cur, cur];

  const paint = () => {
    if (bloom) bloom.textContent = cur;
    face.textContent = cur;
    near.textContent = prev[0];
    mid.textContent  = prev[1];
    deep.textContent = prev[2];
  };

  const tick = () => {
    if (Date.now() >= endAt) { paint(); return; }
    prev[2] = prev[1]; prev[1] = prev[0]; prev[0] = cur;
    cur = String(Math.floor(Math.random() * 10));
    paint();
    raf = requestAnimationFrame(tick);
  };

  paint();
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function stopChaos(shell, finalDigit) {
  const faceClip = shell.querySelector(".nixie-face-clip");
  const bloom    = shell.querySelector(".nixie-bloom");

  faceClip.classList.remove("nixie-face-clip--chaos");
  faceClip.innerHTML = "";

  const face = el("span", "nixie-face nixie-one-regular");
  face.textContent = finalDigit;
  faceClip.appendChild(face);

  if (bloom) bloom.textContent = finalDigit;
}

/* Build nixie stack */
const stackEl  = document.getElementById("nixie-stack");
const stageEl  = document.getElementById("divergence-stage");

const now0 = new Date();
const initialDigits = getDigits(now0);

// 7 digit tubes: [0] [.] [H][H][m][m][s][s]
const tubeShells = [];

function buildStack() {
  initialDigits.forEach((d, i) => {
    const shell = createDigitTube(d);
    tubeShells.push(shell);
    if (i === 0) {
      stackEl.appendChild(shell);
      stackEl.appendChild(createDotTube()); // dot after first "0"
    } else {
      stackEl.appendChild(shell);
    }
    startJitter(shell.querySelector(".nixie-stack-chars"));
  });
}

buildStack();

/* Clock state */
let prevMinute   = now0.getMinutes();
let scrambleUntil = null;
let cancelChaos   = [];

function getDigits(date) {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return ["0", hh[0], hh[1], mm[0], mm[1], ss[0], ss[1]];
}

function stopAllChaos(digits) {
  cancelChaos.forEach(fn => fn && fn());
  cancelChaos = [];
  tubeShells.forEach((shell, i) => stopChaos(shell, digits[i]));
}

function startAllChaos(endAt) {
  cancelChaos = tubeShells.map(shell => startChaos(shell, endAt));
  const ms = Math.max(0, endAt - Date.now());
  setTimeout(() => {
    const digits = getDigits(new Date());
    stopAllChaos(digits);
    scrambleUntil = null;
  }, ms);
}

/* Tick */
setInterval(() => {
  const now = new Date();
  const m   = now.getMinutes();

  if (scrambleUntil === null && m !== prevMinute) {
    scrambleUntil = Date.now() + 1000;
    startAllChaos(scrambleUntil);
  }
  prevMinute = m;

  const digits = getDigits(now);
  stageEl.setAttribute("aria-label", `0.${digits.slice(1).join("")}`);

  if (scrambleUntil !== null) return;

  tubeShells.forEach((shell, i) => updateTubeDigit(shell, digits[i]));
}, 1000);
