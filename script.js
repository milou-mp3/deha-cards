const gallery = document.getElementById("gallery");

// Choisis ton mode ici : "slide" ou "grid"
const MODE = "slide";

// Charger les cartes depuis JSON
fetch("cards.json")
  .then(res => res.json())
  .then(files => {
    if (MODE === "slide") initSlider(files);
    if (MODE === "grid") initGrid(files);
  });

/* ---------------- GRID ---------------- */
function initGrid(files) {
  gallery.className = "mode-grid";
  files.forEach(file => {
    const img = document.createElement("img");
    img.src = "cards/" + file;
    gallery.appendChild(img);
  });
}

/* ---------------- SLIDER ---------------- */
function initSlider(files) {
  gallery.className = "mode-slide";

  const slides = document.createElement("div");
  slides.className = "slides";
  gallery.appendChild(slides);

  files.forEach(file => {
    const img = document.createElement("img");
    img.src = "cards/" + file;
    slides.appendChild(img);
  });

  let currentIndex = 0;
  const cardWidth = 300;
  let startX = 0, startY = 0, startTime = 0;
  let isDragging = false, draggingStarted = false, lastTranslate = 0;

  // ---------------- Couleur dominante hors blanc ----------------
  function getDominantColor(img) {
    const w = 40, h = 40;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    let data;
    try { data = ctx.getImageData(0, 0, w, h).data; }
    catch(e) { console.warn("CORS pb"); return null; }

    const freq = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 128) continue;
      if (r>200 && g>200 && b>200) continue;
      const key = `${Math.floor(r/24)*24},${Math.floor(g/24)*24},${Math.floor(b/24)*24}`;
      freq.set(key, (freq.get(key)||0)+1);
    }

    if (freq.size === 0) return null;
    let bestColor = null, bestCount = 0;
    for (const [col, count] of freq) {
      if (count > bestCount) { bestCount = count; bestColor = col; }
    }
    return `rgb(${bestColor})`;
  }

  function updateBackground(img) {
    const color = getDominantColor(img);
    if (color) document.body.style.background = `linear-gradient(180deg, ${color}, #ffffff)`;
    else document.body.style.background = "#f0f0f0";
  }

  // ---------------- Afficher la slide ----------------
  function showSlide(i, smooth = true) {
    currentIndex = (i + files.length) % files.length;
    slides.style.transition = smooth ? "transform 0.3s ease" : "none";
    const targetX = -currentIndex * cardWidth;
    slides.style.transform = `translateX(${targetX}px)`;
    lastTranslate = targetX;

    const img = slides.children[currentIndex];
    if (img.complete) updateBackground(img);
    else img.onload = () => updateBackground(img);
  }

  // ---------------- Drag amélioré pour mobile ----------------
  slides.addEventListener("pointerdown", e => {
    startX = e.pageX;
    startY = e.pageY;
    startTime = Date.now();
    isDragging = true;
    draggingStarted = false;
    slides.style.transition = "none";
    slides.setPointerCapture(e.pointerId);
  });

  slides.addEventListener("pointermove", e => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;

    if (!draggingStarted && Math.abs(dx) > Math.abs(dy)) {
      draggingStarted = true; // on commence le drag horizontal
    }

    if (draggingStarted) {
      e.preventDefault(); // bloque le scroll vertical
      slides.style.transform = `translateX(${lastTranslate + dx}px)`;
    }
  });

  slides.addEventListener("pointerup", e => {
    if (!isDragging) return;
    isDragging = false;
    slides.releasePointerCapture(e.pointerId);

    if (!draggingStarted) return; // c'était juste un tap

    const dx = e.pageX - startX;
    const dt = Date.now() - startTime;
    const velocity = dx / dt;

    if (dx > 80 || velocity > 0.5) showSlide(currentIndex - 1);
    else if (dx < -80 || velocity < -0.5) showSlide(currentIndex + 1);
    else showSlide(currentIndex);
  });

  slides.addEventListener("pointercancel", e => {
    if (isDragging) { isDragging = false; showSlide(currentIndex); }
  });

  // ---- navigation clavier ----
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") showSlide(currentIndex - 1);
    else if (e.key === "ArrowRight") showSlide(currentIndex + 1);
  });

  // première carte
  showSlide(0);
}
