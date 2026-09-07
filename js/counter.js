/* =========================
   CUENTA REGRESIVA
========================= */

// 📅 Fecha del evento (28 marzo 2026 - 4:00 PM)
//const fechaEvento = new Date("March 28, 2026 16:00:00").getTime();
//const fechaEvento = new Date(2026, 12, 28, 19, 0, 0).getTime();
// 28 de marzo de 2026, 4:00 p.m. → mes 2 (marzo, porque enero=0), hora 16 (formato 24h)

/*
0 = enero
1 = febrero
2 = marzo
3 = abril
4 = mayo
5 = junio
6 = julio
7 = agosto
8 = septiembre
9 = octubre
10 = noviembre
11 = diciembre
*/

const fechaEvento = new Date(2026, 9, 28, 16, 0, 0).getTime();

// Elemento donde se mostrará
const countdownEl = document.getElementById("cuentaRegresiva");

// Verificamos que exista el contenedor
if (countdownEl) {

  function actualizarCuentaRegresiva() {

    const ahora = new Date().getTime();
    const diferencia = fechaEvento - ahora;

    // Si ya llegó el día
    if (diferencia <= 0) {
      countdownEl.innerHTML = "🎉 ¡Hoy es el gran día! 🎉";
      clearInterval(intervalo);
      return;
    }

    // Cálculos
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

    // Mostrar en formato elegante
    countdownEl.innerHTML = `
      <div class="countdown-title">⏳ Faltan</div>
      <div class="countdown-numbers">
        <span>${dias}</span> días · 
        <span>${horas}</span> h · 
        <span>${minutos}</span> m · 
        <span>${segundos}</span> s
      </div>
    `;
  }

  // Actualiza cada segundo
  const intervalo = setInterval(actualizarCuentaRegresiva, 1000);

  // Ejecutar inmediatamente
  actualizarCuentaRegresiva();
}
/**********************************FIN CUENTA REGRESIVA**************************************/
