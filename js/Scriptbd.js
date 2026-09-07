/*
  Manejo avanzado de errores:
  - Muestra error.message, code y details
  - Detecta falta de internet
  - Muestra status HTTP
  - Log completo en consola

  Notas de seguridad:
  - Se usa textContent en vez de innerHTML para insertar datos del invitado (evita XSS).
  - Nunca subir la service_role key al cliente: solo la anon key + RLS en Supabase.
*/

/* =========================================================
   ⚙️ CONFIGURACIÓN DE SECCIONES OPCIONALES
   -----------------------------------------------------------
   Cambia estos valores a true/false para mostrar u ocultar
   cada sección, sin tener que comentar HTML manualmente.
========================================================= */
const CONFIG = {
  mostrarNumeroMesa: false,        // Muestra el bloque "🪑 Tu mesa asignada..."
  mostrarMensajeRegalo: true,     // Bloque del versículo (Eclesiastés)
  mostrarMensajeSobreRegalo: true,// Bloque "El mejor regalo es..."
  mostrarCuentaRegresiva: true,   // Countdown de la boda
  permitirVariosInvitados: true,  // Input de "¿Cuántos asistirán?"
};

/* =========================================================
   🧪 MODO DE PRUEBA
   -----------------------------------------------------------
   MODO_PRUEBA = true  -> usa datosMuestra, NO consulta ni
                          escribe nada en Supabase. Los botones
                          "Confirmar" / "No podré asistir"
                          simulan la confirmación solo en pantalla.
   MODO_PRUEBA = false -> comportamiento real contra Supabase.
========================================================= */
const MODO_PRUEBA = false;

// Datos de muestra que se usan cuando MODO_PRUEBA = true
const datosMuestra = {
  codigo: "INV1234-abcdef01-abcd-abcd-abcd-abcdef012345",
  nombre: "Nehemías Zepeda",
  numero_invitados: 3,
  numero_invitados_confirmados: null,
  numero_mesa: 5,
  confirmado: null // null = aún no responde | true = confirmó | false = no asistirá
};

let invitadoID = null;
const SUPABASE_URL = document.querySelector('meta[name="supabase-url"]')?.content || '';
const SUPABASE_ANON_KEY = document.querySelector('meta[name="supabase-anon-key"]')?.content || '';
const FECHA_LIMITE_CONFIRMACION = new Date("2026-12-31T23:59:59-06:00");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL/KEY no configurados.');
}

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const nombreSpan = document.getElementById('nombreInvitado');
const mensajeRegalo = document.getElementById('mensajeRegalo');
const contenedor = document.getElementById('contenedorInvitados');
const contador = document.getElementById('contadorInvitados');
const input = document.getElementById('inputInvitados');
const btn = document.getElementById('btnConfirmar');
const btnNo = document.getElementById('btnNoConfirmar');
const contenedorMensaje = document.getElementById('mensajeConfirmacion');
const msjeMesa = document.getElementById('msjeMesa');
const numMesa = document.getElementById('numMesa');

function fechaLimiteAlcanzada() {
  const ahora = new Date();
  return ahora > FECHA_LIMITE_CONFIRMACION;
}

function aplicarConfiguracion() {
  const msjeMesaEl = document.getElementById('msjeMesa');
  const mensajeRegaloEl = document.getElementById('mensajeRegalo');
  const mensajeSobreRegaloEl = document.getElementById('mensajeSobreRegalo');
  const contenedorInvitadosEl = document.getElementById('contenedorInvitados');
  const cuentaRegresivaEl = document.getElementById('cuentaRegresiva');

  if (msjeMesaEl) msjeMesaEl.style.display = CONFIG.mostrarNumeroMesa ? '' : 'none';

  if (mensajeRegaloEl) {
    mensajeRegaloEl.style.display = CONFIG.mostrarMensajeRegalo ? 'block' : 'none';
    if (CONFIG.mostrarMensajeRegalo) mensajeRegaloEl.removeAttribute('aria-hidden');
  }

  if (mensajeSobreRegaloEl) {
    mensajeSobreRegaloEl.style.display = CONFIG.mostrarMensajeSobreRegalo ? 'block' : 'none';
    if (CONFIG.mostrarMensajeSobreRegalo) mensajeSobreRegaloEl.removeAttribute('aria-hidden');
  }

  if (cuentaRegresivaEl) cuentaRegresivaEl.style.display = CONFIG.mostrarCuentaRegresiva ? '' : 'none';
}

/* =========================
   🔄 LOADER INICIAL
========================= */

// Oculta el overlay de "Cargando tu invitación..." con una transición suave.
// Se llama en TODOS los puntos donde termina la carga inicial (éxito o error),
// para que nunca se quede tapando la pantalla indefinidamente.
function ocultarLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.add('oculto');
}

/* =========================
   FUNCIONES DE MENSAJES
========================= */

// Escapa texto para uso seguro si en algún punto se necesita insertar HTML
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Mensaje de texto plano (uso normal, evita XSS con textContent)
function showMessage(text, opts = {}) {
  contenedorMensaje.style.display = 'block';

  if (opts.type === 'error') {
    contenedorMensaje.style.color = 'var(--error)';
    contenedorMensaje.setAttribute('aria-live', 'assertive');
  } else {
    contenedorMensaje.style.color = opts.color || 'var(--verde-dark)';
    contenedorMensaje.setAttribute('aria-live', 'polite');
  }

  contenedorMensaje.textContent = text;
}

// Variante con HTML controlado (solo usar con contenido propio, nunca con datos crudos del usuario)
function showHTMLMessage(html, opts = {}) {
  contenedorMensaje.style.display = 'block';

  if (opts.type === 'error') {
    contenedorMensaje.style.color = 'var(--error)';
    contenedorMensaje.setAttribute('aria-live', 'assertive');
  } else {
    contenedorMensaje.style.color = opts.color || 'var(--verde-dark)';
    contenedorMensaje.setAttribute('aria-live', 'polite');
  }

  contenedorMensaje.innerHTML = html;
}

async function mostrarErrorSupabase(error, status = null) {
  console.error("===== ERROR SUPABASE =====");
  console.error("Status:", status);
  console.error("Error completo:", error);

  let mensaje = "Ocurrió un error.";

  if (!navigator.onLine) {
    mensaje = "No tienes conexión a internet.";
  } else if (error) {
    mensaje = `
    Error: ${error.message || 'Error desconocido'}
    ${error.code ? `Código: ${error.code}` : ''}
    ${error.details ? `Detalle: ${error.details}` : ''}
    ${status ? `HTTP: ${status}` : ''}
    `;
  }

  showMessage(mensaje, { type: 'error' });
  await mostrarModalMensaje('❌' + mensaje);
}

/* =========================
   CARGA INICIAL
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  aplicarConfiguracion(); // 👈 primero aplica la configuración
  btn.addEventListener('click', confirmarAsistencia);
  btnNo.addEventListener('click', confirmarNoAsistencia);

  // ⛔ Validar fecha límite
  if (fechaLimiteAlcanzada()) {
    btn.disabled = true;
    btnNo.disabled = true;

    btn.style.background = "#888";
    btnNo.style.background = "#888";

    contenedor.style.display = "none";
    // ⚠ NO usar return aquí (se deja seguir cargando el resto de datos)
  }

  // 🔎 Obtener ID (en modo prueba no se usa, pero se deja listo para producción)
  function obtenerID() {
    const hashID = window.location.hash.substring(1);
    if (hashID) return hashID;

    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  invitadoID = MODO_PRUEBA ? datosMuestra.codigo : obtenerID();

  if (!MODO_PRUEBA) {
    if (!invitadoID) {
      ocultarLoader();
      await mostrarModalMensajeError("❌ Enlace inválido. Este enlace no es válido o ya no está disponible. Por favor, solicita una nueva invitación.");
      return;
    }

    const regexCodigo = /^INV\d{4}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!regexCodigo.test(invitadoID)) {
      ocultarLoader();
      await mostrarModalMensajeError("❌ Este enlace no es válido o está incompleto.");
      return;
    }

    if (!navigator.onLine) {
      ocultarLoader();
      await mostrarModalMensajeError('❌ No tienes conexión a internet. Recargue la página o intente más tarde.');
      return;
    }
  }

  try {
    let data;

    if (MODO_PRUEBA) {
      console.log("🧪 MODO_PRUEBA activo: usando datos de muestra, no se consulta Supabase.");
      data = { ...datosMuestra };
    } else {
      const { data: fetchedData, error, status } = await db
        .from("invitados")
        .select("*")
        .eq("codigo", invitadoID)
        .single();

      if (error) {
        ocultarLoader();
        await mostrarModalMensajeError("❌ Este enlace no es válido o ya no está disponible.");
        return;
      }

      if (!fetchedData) {
        ocultarLoader();
        await mostrarModalMensajeError('❌ Este enlace no es válido o ya no está disponible. Por favor, solicita una nueva invitación.');
        return;
      }

      data = fetchedData;
    }

    // ✅ textContent, nunca innerHTML, para datos que vienen de la base de datos
    nombreSpan.textContent = data.nombre;
    mensajeRegalo.style.display = 'block';

    // 🪑 Mostrar mesa
    if (CONFIG.mostrarNumeroMesa && numMesa) {
      numMesa.textContent = `🪑 Tu mesa asignada es la número ${data.numero_mesa}`;
      msjeMesa.style.display = 'block';
      msjeMesa.removeAttribute('aria-hidden');
    }

    if (data.numero_invitados === 1 || data.confirmado === true) {
      contenedor.style.display = 'none';
    }

    if (data.numero_invitados > 1 && data.confirmado !== true) {
      contador.textContent = `invitación para ${data.numero_invitados} personas.`;
      input.setAttribute('max', String(data.numero_invitados));
    }

    if (data.confirmado === true) {
      btn.textContent = "Ya confirmado ✔";
      btn.style.background = "#888";
      btn.disabled = true;

      const confirmados = data.numero_invitados_confirmados || 1;
      const numeromesa = data.numero_mesa || 1;

      if (CONFIG.mostrarNumeroMesa) {
        showMessage(
          `Hola ${data.nombre}, gracias por confirmar 🤎 Has confirmado ${confirmados} invitado(s). tu mesa asignada es la número ${numeromesa} ¡Te Esperamos!`
        );
      } else {
        showMessage(
          `Hola ${data.nombre}, gracias por confirmar 🤎 Has confirmado ${confirmados} invitado(s). ¡Te Esperamos!`
        );
      }

      btnNo.disabled = true;
      btnNo.style.display = "none";
    }

    if (data.confirmado === false) {
      btnNo.textContent = "Has confirmado que no asistirás. ✔";
      btnNo.style.background = "#888";
      btnNo.disabled = true;

      contenedor.style.display = "none";

      showMessage(`Hola ${data.nombre}, gracias por confirmar 🤎 Has confirmado que no asistirás.`);

      btn.disabled = true;
      btn.style.display = "none";
    }

    // ✅ Todo cargó correctamente: ocultamos el loader
    ocultarLoader();

  } catch (err) {
    console.error("ERROR GENERAL:", err);
    ocultarLoader();
    await mostrarModalMensajeError(`❌ Error inesperado: ${err.message || 'No se pudo conectar al servidor.'}`);
  }
});

/* =========================
   MODAL LOGICA
========================= */

const modal = document.getElementById('modalConfirmacion');
const modalTexto = document.getElementById('modalTexto');
const modalAceptar = document.getElementById('modalAceptar');
const modalCancelar = document.getElementById('modalCancelar');
const spinner = document.getElementById('spinner');
const btnTexto = document.getElementById('btnTexto');

function mostrarModal(mensaje) {
  return new Promise((resolve) => {

    modalTexto.textContent = mensaje;
    modal.style.display = 'flex';

    function cerrar(valor) {
      modal.style.display = 'none';
      modalAceptar.classList.remove('loading');
      spinner.style.display = 'none';
      btnTexto.textContent = 'Confirmar';
      modalAceptar.disabled = false;

      modalAceptar.removeEventListener('click', aceptar);
      modalCancelar.removeEventListener('click', cancelar);

      resolve(valor);
    }

    async function aceptar() {
      modalAceptar.classList.add('loading');
      spinner.style.display = 'inline-block';
      btnTexto.textContent = 'Guardando...';
      modalAceptar.disabled = true;

      try {
        // Pequeña espera simulada para que se vea el spinner (también en modo prueba)
        await new Promise(resolve => setTimeout(resolve, 800));
        cerrar(true);
      } catch (error) {
        console.error(error);
        cerrar(false);
      }
    }

    function cancelar() {
      cerrar(false);
    }

    modalAceptar.addEventListener('click', aceptar);
    modalCancelar.addEventListener('click', cancelar);

    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escListener);
        cerrar(false);
      }
    });

  });
}

/* Modal mensaje informativo */

const modalMensaje = document.getElementById('modalMessage');
const modalTextoMensaje = document.getElementById('modalTextoMensaje');
const modalCerrarMensaje = document.getElementById('modalCerrarMensaje');

function mostrarModalMensaje(mensaje) {
  return new Promise((resolve) => {

    modalTextoMensaje.textContent = mensaje;
    modalMensaje.style.display = 'flex';

    function cerrar() {
      modalMensaje.style.display = 'none';
      modalCerrarMensaje.removeEventListener('click', cerrar);
      resolve(true);
    }

    modalCerrarMensaje.addEventListener('click', cerrar);

    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escListener);
        cerrar();
      }
    });

  });
}

/* Modal mensaje de error */

const modalMensajeError = document.getElementById('modalMessageError');
const modalTextoMensajeError = document.getElementById('modalTextoMensajeError');

function mostrarModalMensajeError(mensaje) {
  return new Promise((resolve) => {
    modalTextoMensajeError.textContent = mensaje;
    modalMensajeError.style.display = 'flex';
    resolve(true);
  });
}

/* =========================
   CONFIRMAR ASISTENCIA
========================= */

async function confirmarAsistencia() {

  if (fechaLimiteAlcanzada()) {
    await mostrarModalMensaje("⏰ Lo sentimos, la fecha límite para confirmar asistencia ya finalizó.");
    return;
  }

  const seguro = await mostrarModal("¿Deseas confirmar tu asistencia?");
  if (!seguro) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Guardando...';

  try {

    if (!MODO_PRUEBA && !navigator.onLine) {
      await mostrarModalMensaje('No tienes conexión a internet.');
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    /* =========================================================
       🧪 RAMA MODO PRUEBA: todo se simula en memoria/pantalla,
       no se consulta ni se escribe en Supabase.
    ========================================================= */
    if (MODO_PRUEBA) {

      if (datosMuestra.confirmado === true) {
        await mostrarModalMensaje('Ya habías confirmado antes 🤎');
        return;
      }

      let cantidadConfirmada = 1;

      if (datosMuestra.numero_invitados > 1) {
        cantidadConfirmada = parseInt(input.value, 10);

        if (!cantidadConfirmada || cantidadConfirmada < 1) {
          await mostrarModalMensaje('❌ Debe ingresar cuántos asistirán.');
          btn.textContent = originalText;
          btn.disabled = false;
          return;
        }

        if (cantidadConfirmada > datosMuestra.numero_invitados) {
          btn.textContent = originalText;
          btn.disabled = false;
          await mostrarModalMensaje(`❌ Solo puedes confirmar hasta ${datosMuestra.numero_invitados} invitado(s).`);
          return;
        }
      }

      // Actualiza el objeto en memoria (simulación)
      datosMuestra.confirmado = true;
      datosMuestra.numero_invitados_confirmados = cantidadConfirmada;

      btn.textContent = "Confirmado ✔";
      btn.style.background = "#888";
      btn.disabled = true;

      contenedor.style.display = "none";

      if (CONFIG.mostrarNumeroMesa && numMesa) {
        numMesa.textContent = `🪑 Tu mesa asignada es la número ${datosMuestra.numero_mesa}`;
        msjeMesa.style.display = 'block';
        msjeMesa.removeAttribute('aria-hidden');
      }

      btnNo.disabled = true;
      btnNo.style.display = "none";

      showMessage(
        `Hola ${datosMuestra.nombre}, gracias por confirmar 🤎 Has confirmado ${cantidadConfirmada} invitado(s). ¡Te Esperamos!`
      );

      if (CONFIG.mostrarNumeroMesa && numMesa) {
        await mostrarModalMensaje(
          `🎉 Gracias por confirmar tu asistencia 🤎. Has confirmado ${cantidadConfirmada} invitado(s), tu mesa asignada es la número ${datosMuestra.numero_mesa} ¡Te Esperamos!`
        );
      } else {
        await mostrarModalMensaje(
          `🎉 Gracias por confirmar tu asistencia 🤎. Has confirmado ${cantidadConfirmada} invitado(s), ¡Te Esperamos!`
        );
      }

      return;
    }

    /* =========================================================
       RAMA REAL: contra Supabase
    ========================================================= */

    const { data: invitado, error: fetchErr, status: fetchStatus } = await db
      .from("invitados")
      .select("confirmado, nombre, numero_invitados, numero_invitados_confirmados, numero_mesa")
      .eq("codigo", invitadoID)
      .single();

    if (fetchErr) {
      await mostrarErrorSupabase(fetchErr, fetchStatus);
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    if (!invitado) {
      await mostrarModalMensaje('❌ Invitado no encontrado.');
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    if (invitado.confirmado) {
      await mostrarModalMensaje('Ya habías confirmado antes 🤎');

      btn.textContent = "Confirmado ✔";
      btn.style.background = "#888";
      btn.disabled = true;

      contenedor.style.display = "none";

      btnNo.disabled = true;
      btnNo.style.display = "none";

      if (CONFIG.mostrarNumeroMesa && numMesa) {
        showMessage(
          `Hola ${invitado.nombre}, gracias por confirmar 🤎 Has confirmado ${invitado.numero_invitados_confirmados} invitado(s). tu mesa asignada es la número ${invitado.numero_mesa} ¡Te Esperamos!`
        );
      } else {
        showMessage(
          `Hola ${invitado.nombre}, gracias por confirmar 🤎 Has confirmado ${invitado.numero_invitados_confirmados} invitado(s). ¡Te Esperamos!`
        );
      }

      return;
    }

    let cantidadConfirmada = 1;

    if (invitado.numero_invitados > 1) {
      cantidadConfirmada = parseInt(input.value, 10);

      if (!cantidadConfirmada || cantidadConfirmada < 1) {
        await mostrarModalMensaje('❌ Debe ingresar cuántos asistirán.');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      if (cantidadConfirmada > invitado.numero_invitados) {
        btn.textContent = originalText;
        btn.disabled = false;
        await mostrarModalMensaje(`❌ Solo puedes confirmar ${invitado.numero_invitados} invitado(s).`);
        return;
      }
    }

    const updatedData = {
      confirmado: true,
      fecha_confirmacion: new Date().toISOString().split("T")[0],
      hora_confirmacion: new Date().toLocaleTimeString("es-ES", { hour12: false }),
      numero_invitados_confirmados: cantidadConfirmada
    };

    const { error: updateErr, status: updateStatus } = await db
      .from("invitados")
      .update(updatedData)
      .eq("codigo", invitadoID)
      .or("confirmado.is.null,confirmado.eq.false")
      .select();

    if (updateErr) {
      await mostrarErrorSupabase(updateErr, updateStatus);
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    btn.textContent = "Confirmado ✔";
    btn.style.background = "#888";
    btn.disabled = true;

    contenedor.style.display = "none";

    if (CONFIG.mostrarNumeroMesa && numMesa) {
      numMesa.textContent = `🪑 Tu mesa asignada es la número ${invitado.numero_mesa}`;
      msjeMesa.style.display = 'block';
      msjeMesa.removeAttribute('aria-hidden');
    }

    btnNo.disabled = true;
    btnNo.style.display = "none";

    showMessage(
      `Hola ${invitado.nombre}, gracias por confirmar 🤎 Has confirmado ${cantidadConfirmada} invitado(s). ¡Te Esperamos!`
    );

    if (CONFIG.mostrarNumeroMesa && numMesa) {
      await mostrarModalMensaje(
        `🎉 Gracias por confirmar tu asistencia 🤎. Has confirmado ${cantidadConfirmada} invitado(s), tu mesa asignada es la número ${invitado.numero_mesa} ¡Te Esperamos!`
      );
    } else {
      await mostrarModalMensaje(
        `🎉 Gracias por confirmar tu asistencia 🤎. Has confirmado ${cantidadConfirmada} invitado(s), ¡Te Esperamos!`
      );
    }

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    await mostrarModalMensaje(`❌ Error inesperado: ${err.message || 'Error de conexión.'}`);
    btn.textContent = originalText;
    btn.disabled = false;
  } finally {
    if (!btn.disabled) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }
}

/* Enviar con Enter */
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btn.click();
  }
});

/* =========================
   NO ASISTIRÁ
========================= */

async function confirmarNoAsistencia() {

  if (fechaLimiteAlcanzada()) {
    await mostrarModalMensaje("⏰ La fecha límite para confirmar asistencia ya finalizó.");
    return;
  }

  const seguro = await mostrarModal("¿Deseas confirmar que NO asistirás?");
  if (!seguro) return;

  btnNo.disabled = true;
  const originalText = btnNo.textContent;
  btnNo.textContent = 'Guardando...';

  try {

    if (!MODO_PRUEBA && !navigator.onLine) {
      await mostrarModalMensaje('❌ No tienes conexión a internet.');
      btnNo.textContent = originalText;
      btnNo.disabled = false;
      return;
    }

    /* =========================================================
       🧪 RAMA MODO PRUEBA
    ========================================================= */
    if (MODO_PRUEBA) {

      if (datosMuestra.confirmado === false) {
        showMessage('Has confirmado que no asistirás 🤎');
        return;
      }

      datosMuestra.confirmado = false;

      btnNo.textContent = "Has confirmado que no asistirás. ✔";
      btnNo.style.background = "#888";
      btnNo.disabled = true;

      contenedor.style.display = "none";

      showMessage(`Hola ${datosMuestra.nombre}, gracias por confirmar 🤎 Has confirmado que no asistirás.`);

      await mostrarModalMensaje(
        `Hola ${datosMuestra.nombre}, gracias por confirmar 🤎 Has confirmado que no asistirás.`
      );

      btn.disabled = true;
      btn.style.display = "none";

      return;
    }

    /* =========================================================
       RAMA REAL: contra Supabase
    ========================================================= */

    const { data: invitado, error: fetchErr, status: fetchStatus } = await db
      .from("invitados")
      .select("confirmado, nombre, numero_invitados, numero_invitados_confirmados, numero_mesa")
      .eq("codigo", invitadoID)
      .single();

    if (fetchErr) {
      await mostrarErrorSupabase(fetchErr, fetchStatus);
      btnNo.textContent = originalText;
      btnNo.disabled = false;
      return;
    }

    if (!invitado) {
      showMessage('Invitado no encontrado.', { type: 'error' });
      btnNo.textContent = originalText;
      btnNo.disabled = false;
      return;
    }

    if (invitado.confirmado === false) {
      showMessage('Has confirmado que no asistirás 🤎');
      return;
    }

    const updatedData = {
      confirmado: false,
      fecha_confirmacion: new Date().toISOString().split("T")[0],
      hora_confirmacion: new Date().toLocaleTimeString("es-ES", { hour12: false })
    };

    const { error: updateErr, status: updateStatus } = await db
      .from("invitados")
      .update(updatedData)
      .eq("codigo", invitadoID)
      .or("confirmado.is.null,confirmado.eq.false")
      .select();

    if (updateErr) {
      await mostrarErrorSupabase(updateErr, updateStatus);
      btnNo.textContent = originalText;
      btnNo.disabled = false;
      return;
    }

    btnNo.textContent = "Has confirmado que no asistirás. ✔";
    btnNo.style.background = "#888";
    btnNo.disabled = true;

    contenedor.style.display = "none";

    showMessage(`Hola ${invitado.nombre}, gracias por confirmar 🤎 Has confirmado que no asistirás.`);

    await mostrarModalMensaje(
      `Hola ${invitado.nombre}, gracias por confirmar 🤎 Has confirmado que no asistirás.`
    );

    btn.disabled = true;
    btn.style.display = "none";

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    await mostrarModalMensaje(`❌ Error inesperado: ${err.message || 'Error de conexión.'}`);
    btnNo.textContent = originalText;
    btnNo.disabled = false;
  } finally {
    if (!btnNo.disabled) {
      btnNo.textContent = originalText;
      btnNo.disabled = false;
    }
  }
}
