let cards = [];
let currentIndex = 0;

fetch("cards/cards.json")
  .then(res => res.json())
  .then(data => {
    cards = data;
    let savedIndex = parseInt(localStorage.getItem("lastCardIndex"), 10);
	if (isNaN(savedIndex)) {
  		savedIndex = 0;
	}

	showCard(savedIndex);

  })
  .catch(err => console.error("Impossible de charger cards.json :", err));

function showCard(index) {
  currentIndex = (index + cards.length) % cards.length;

  localStorage.setItem("lastCardIndex", currentIndex);

  const card = cards[currentIndex];
  const container = document.getElementById("card-container");
  container.innerHTML = "";

  const img = document.createElement("img");
  img.src = "cards/" + card.file;
  img.alt = card.artist;

  const name = document.createElement("div");
  name.textContent = card.artist;

  container.appendChild(img);
  container.appendChild(name);

  // Mettre le fond sur la couleur dominante
  if (img.complete) setBackground(img, name);
  else img.onload = () => setBackground(img, name);

  resizeCard();
}

function setBackground(img, textDiv) {
  const w = 40, h = 40;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h).data;
  const freq = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a < 128) continue;
    if (r>200 && g>200 && b>200) continue; // ignore blanc sale
    const key = `${Math.floor(r/24)*24},${Math.floor(g/24)*24},${Math.floor(b/24)*24}`;
    freq.set(key, (freq.get(key)||0)+1);
  }

  if (freq.size === 0) return;

  let bestColor = null, bestCount = 0;
  for (const [col,count] of freq) {
    if (count > bestCount){ bestCount=count; bestColor=col; }
  }

  document.body.style.background = `rgb(${bestColor})`;

  if(textDiv) {
    textDiv.style.color = bestColor;
  }
}

// texte lisible selon luminosité
function getTextColor(rgbString) {
  const [r, g, b] = rgbString.split(",").map(Number);
  const brightness = (r*299 + g*587 + b*114) / 1000;
  return brightness > 150 ? "#000000" : "#ffffff";
}

// ---- Navigation clavier ----
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") showCard(currentIndex - 1);
  if (e.key === "ArrowRight") showCard(currentIndex + 1);
});

// ---- Swipe tactile ----
let startX = 0;
let startY = 0;
let isDragging = false;
const container = document.getElementById("card-container");

container.addEventListener("touchstart", e => {
  startX = e.touches[0].pageX;
  startY = e.touches[0].pageY;
  isDragging = true;
}, {passive: true});

container.addEventListener("touchmove", e => {
  if (!isDragging) return;
  const dx = e.touches[0].pageX - startX;
  const dy = e.touches[0].pageY - startY;

  if (Math.abs(dx) > Math.abs(dy)) {
    e.preventDefault(); // bloque le scroll horizontal
  }
}, {passive: false});

container.addEventListener("touchend", e => {
  if (!isDragging) return;
  isDragging = false;

  const dx = e.changedTouches[0].pageX - startX;

  if (dx > 50) {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    showCard(currentIndex);
  } else if (dx < -50) {
    currentIndex = (currentIndex + 1) % cards.length;
    showCard(currentIndex);
  }
});

container.addEventListener("click", e => {
  const rect = container.getBoundingClientRect();
  const clickX = e.clientX - rect.left; // position du clic dans le container
  const width = rect.width;

  if (clickX < width / 2) {
    // clic côté gauche → carte précédente
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
  } else {
    // clic côté droit → carte suivante
    currentIndex = (currentIndex + 1) % cards.length;
  }

  showCard(currentIndex);
});

function resizeCard() {
  const img = document.querySelector("#card-container img");
  if (!img) return;

  const h = window.innerHeight * 0.90;
  img.style.maxHeight = h + "px";
}

// appliquer au chargement et au resize
window.addEventListener("load", resizeCard);
window.addEventListener("resize", resizeCard);
