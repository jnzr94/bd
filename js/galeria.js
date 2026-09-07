/* =========================================================
   📸 GALERÍA / CARRUSEL DE FOTOS
   -----------------------------------------------------------
   Navegación con flechas, puntos (dots) y swipe táctil.
   No depende de ninguna librería externa.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const galeria = document.getElementById('galeriaBoda');
  if (!galeria) return; // Si no existe la galería en esta página, no hace nada

  const track = document.getElementById('galeriaTrack');
  const slides = track.querySelectorAll('.galeria-slide');
  const btnPrev = document.getElementById('galeriaPrev');
  const btnNext = document.getElementById('galeriaNext');
  const dotsContainer = document.getElementById('galeriaDots');

  let indiceActual = 0;
  const totalSlides = slides.length;

  // Si solo hay 1 foto, ocultamos flechas y puntos (no tiene sentido navegar)
  if (totalSlides <= 1) {
    if (btnPrev) btnPrev.style.display = 'none';
    if (btnNext) btnNext.style.display = 'none';
    if (dotsContainer) dotsContainer.style.display = 'none';
    return;
  }

  // Genera los puntos de navegación dinámicamente según cuántas fotos haya
  function crearDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'galeria-dot' + (i === 0 ? ' activo' : '');
      dot.setAttribute('aria-label', `Ir a foto ${i + 1}`);
      dot.addEventListener('click', () => irASlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  function actualizarDots() {
    const dots = dotsContainer.querySelectorAll('.galeria-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('activo', i === indiceActual);
    });
  }

  function irASlide(indice) {
    // Rueda de forma circular: después de la última foto vuelve a la primera
    indiceActual = (indice + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${indiceActual * 100}%)`;
    actualizarDots();
  }

  function siguiente() {
    irASlide(indiceActual + 1);
  }

  function anterior() {
    irASlide(indiceActual - 1);
  }

  crearDots();

  if (btnNext) btnNext.addEventListener('click', siguiente);
  if (btnPrev) btnPrev.addEventListener('click', anterior);

  /* =========================
     SWIPE TÁCTIL (mobile)
  ========================= */
  let inicioX = 0;
  let arrastrando = false;

  track.addEventListener('touchstart', (e) => {
    inicioX = e.touches[0].clientX;
    arrastrando = true;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    if (!arrastrando) return;
    arrastrando = false;

    const finX = e.changedTouches[0].clientX;
    const diferencia = finX - inicioX;
    const UMBRAL_SWIPE = 40; // píxeles mínimos para considerar que fue un swipe

    if (diferencia > UMBRAL_SWIPE) {
      anterior(); // deslizó hacia la derecha → foto anterior
    } else if (diferencia < -UMBRAL_SWIPE) {
      siguiente(); // deslizó hacia la izquierda → foto siguiente
    }
  });
});
