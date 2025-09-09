document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("card-container");

  // crée les éléments une fois (évite les querySelector null)
  const img = document.createElement("img");
  const caption = document.createElement("div");
  container.appendChild(img);
  container.appendChild(caption);

  // style minimal si tu n'as pas de CSS séparé
  img.style.maxWidth = "90vw";
  img.style.objectFit = "contain";
  img.style.transition = "transform 0.12s ease";
  caption.style.marginTop = "10px";
  caption.style.fontFamily = "sans-serif";
  caption.style.fontSize = "1.1em";
  caption.style.fontWeight = "600";
  caption.style.textAlign = "center";

  let cards = [];
  let currentIndex = 0;

  // récupérer index stocké proprement
  const saved = parseInt(localStorage.getItem("lastCardIndex"), 10);
  currentIndex = isNaN(saved) ? 0 : saved;

  // charge les cartes
  fetch("cards/cards.json")
    .then(res => {
      if (!res.ok) throw new Error("cards.json introuvable");
      return res.json();
    })
    .then(data => {
      cards = data;
      if (!cards || !cards.length) return;
      // clamp currentIndex si > longueur
      currentIndex = ((currentIndex % cards.length) + cards.length) % cards.length;
      showCard(currentIndex);
    })
    .catch(err => console.error("Impossible de charger cards.json :", err));

  // affiche la carte à l'index (met à jour localStorage)
  function showCard(idx) {
    if (!cards.length) return;
    currentIndex = ((idx % cards.length) + cards.length) % cards.length;
    const card = cards[currentIndex];

    // reset transform/état de tenue
    img.classList.remove("held");
    img.style.transform = "";

    img.src = "cards/" + card.file;
    img.alt = card.artist || card.file;
    caption.textContent = card.artist || "";

    // fond + couleur texte quand l'image est prête
    if (img.complete) setBackground(img, caption);
    else img.onload = () => setBackground(img, caption);

    resizeCard();
    localStorage.setItem("lastCardIndex", currentIndex);
  }

  // calcule couleur dominante (quantification simple) et applique fond uni + couleur du texte
  function setBackground(imgEl, textDiv) {
    try {
      const w = 40, h = 40;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(imgEl, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const freq = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 128) continue;
        if (r > 200 && g > 200 && b > 200) continue; // ignore blanc sale
        const key = `${Math.floor(r/24)*24},${Math.floor(g/24)*24},${Math.floor(b/24)*24}`;
        freq.set(key, (freq.get(key) || 0) + 1);
      }
      if (freq.size === 0) return;
      let best = null, bestCount = 0;
      for (const [k, v] of freq) {
        if (v > bestCount) { bestCount = v; best = k; }
      }
      document.body.style.background = `rgb(${best})`;
      if (textDiv) textDiv.style.color = getTextColor(best);
    } catch (e) {
      console.warn("Erreur setBackground:", e);
    }
  }

  function getTextColor(rgbString) {
    const [r,g,b] = rgbString.split(",").map(Number);
    const brightness = (r*299 + g*587 + b*114) / 1000;
    return brightness > 150 ? "#000" : "#fff";
  }

  // resize pour mobile (utilise window.innerHeight réel)
  function resizeCard() {
    if (!img) return;
    const h = Math.round(window.innerHeight * 0.92); // 92% de la zone utile
    img.style.maxHeight = h + "px";
  }
  window.addEventListener("resize", resizeCard);
  window.addEventListener("orientationchange", resizeCard);

  // navigation clavier
  document.addEventListener("keydown", e => {
    if (!cards.length) return;
    if (e.key === "ArrowRight") showCard(currentIndex + 1);
    else if (e.key === "ArrowLeft") showCard(currentIndex - 1);
  });

  // ----- pointer events pour swipe + hold (unifiés) -----
  let pointerActive = false;
  let pointerId = null;
  let startX = 0, startY = 0, startTime = 0;
  let dragging = false;

  container.addEventListener("pointerdown", e => {
    // only primary button (left/mouse) or touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerActive = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startTime = Date.now();
    dragging = false;
    container.setPointerCapture(pointerId);

    // start hold effect if clicked on image
    if (e.target === img) {
      img.classList.add("held");
    }
  });

  container.addEventListener("pointermove", e => {
    if (!pointerActive || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // si mouvement horizontal notable => on considère que c'est un drag/swipe
    if (!dragging && Math.abs(dx) > 1000 && Math.abs(dx) > Math.abs(dy)) {
      dragging = true;
      // empêcher le comportement natif (scroll) si c'est un vrai drag horizontal
      try { e.preventDefault(); } catch(e){/* ignore */ }
    }

    // effet "tenir" : suivre légèrement la position si l'image est tenue
    if (img.classList.contains("held")) {
      const followX = (e.clientX - window.innerWidth / 2) * 0.04; // sensibilité
      const followY = (e.clientY - window.innerHeight / 2) * 0.04;
      img.style.transform = `scale(1.08) translate(${followX}px, ${followY}px)`;
    }
  });

  container.addEventListener("pointerup", e => {
  if (!pointerActive || e.pointerId !== pointerId) return;
  pointerActive = false;
  try { container.releasePointerCapture(pointerId); } catch(_) {}

  const dx = e.clientX - startX;
  const dt = Date.now() - startTime;
  const velocity = dx / dt;

  const SWIPE_THRESHOLD = 40; // pixels minimal pour swipe
  const VELOCITY_THRESHOLD = 0.5;

  if (dragging) {
    if (dx > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      showCard(currentIndex - 1);
    } else if (dx < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
      showCard(currentIndex + 1);
    }
  }

  // reset hold
  img.classList.remove("held");
  img.style.transform = "";
});


  container.addEventListener("pointercancel", e => {
    pointerActive = false;
    try { container.releasePointerCapture(pointerId); } catch(_) {}
    img.classList.remove("held");
    img.style.transform = "";
  });

  // empêche la sélection lors d'un tap ou clic prolongé
img.addEventListener("mousedown", e => e.preventDefault());
img.addEventListener("touchstart", e => e.preventDefault());


  // empêche sélection texte au drag (optionnel)
  container.addEventListener("dragstart", e => e.preventDefault());
});
