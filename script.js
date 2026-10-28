let tasas = {
  usdBcv: 0,
  eurBcv: 0,
  usdt: 0
};


const inputUsd = document.getElementById('usd-input');
const inputEur = document.getElementById('eur-input');
const inputUsdt = document.getElementById('usdt-input');
const inputVes = document.getElementById('ves-input');


const rateUsd = document.getElementById('rate-usd');
const rateEur = document.getElementById('rate-eur');
const rateUsdt = document.getElementById('rate-usdt');
const rateSpread = document.getElementById('rate-spread');


const estadoApi = document.getElementById('estado-api');
const estadoBadge = document.getElementById('estado-badge');
const estadoBadgeText = document.getElementById('estado-badge-text');
const estadoWeekday = document.getElementById('estado-weekday');
const estadoDay = document.getElementById('estado-day');
const estadoMeta = document.getElementById('estado-meta');
const refreshBtn = document.getElementById('refresh-btn');


const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const UMBRAL_OBSOLETO_MS = 3 * 60 * 60 * 1000;

let inputsHabilitados = false;
let toastTimeout = null;

function formatearHace(fecha) {
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const minutos = Math.round((fecha.getTime() - Date.now()) / 60000);

  if (Math.abs(minutos) < 60) {
    return rtf.format(minutos, 'minute');
  }

  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) {
    return rtf.format(horas, 'hour');
  }

  const dias = Math.round(horas / 24);
  return rtf.format(dias, 'day');
}

function parseValorFormateado(str) {
  if (!str) return 0;
  const normalizado = String(str).replace(/\./g, '').replace(',', '.');
  const value = parseFloat(normalizado);
  return Number.isFinite(value) ? value : 0;
}

function formatearMiles(raw) {
  if (!raw && raw !== 0) return '';
  const [intParte, decParte] = String(raw).split(',');
  const intFormateado = intParte.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decParte !== undefined ? `${intFormateado},${decParte}` : intFormateado;
}

function sanitizarEntrada(valor, esBorrado) {
  if (esBorrado) {
    return valor.replace(/[^\d,]/g, '');
  }

  const limpio = valor.replace(/[^\d.,]/g, '');
  if (!limpio) return '';

  const tieneComa = limpio.includes(',');
  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');

  if (tieneComa) {
    const entera = limpio.slice(0, ultimaComa).replace(/\D/g, '');
    const decimal = limpio.slice(ultimaComa + 1).replace(/\D/g, '');
    return decimal === '' ? `${entera},` : `${entera},${decimal}`;
  }

  if (ultimoPunto === -1) return limpio;

  const antes = limpio.slice(0, ultimoPunto);
  const despues = limpio.slice(ultimoPunto + 1);

  if (despues.length <= 2) {
    return `${antes.replace(/\D/g, '')},${despues}`;
  }

  return limpio.replace(/\D/g, '');
}

function escribirFormateado(numero) {
  return formatearMiles(Number(numero).toFixed(2).replace('.', ','));
}

function manejarEntrada(e) {
  const input = e.target;
  const valorBruto = input.value;
  const caret = input.selectionStart ?? valorBruto.length;
  const esBorrado = e.inputType?.startsWith('delete') || e.inputType === 'historyUndo';
  const insertoPunto = e.inputType === 'insertText' && e.data === '.' && valorBruto.endsWith('.');
  const caracteresAntes = (valorBruto.slice(0, caret).match(/[\d,]/g) || []).length;

  input.value = formatearMiles(sanitizarEntrada(valorBruto, esBorrado));

  let pos = 0;
  if (insertoPunto) {
    pos = input.value.indexOf(',') + 1;
    if (pos === 0) {
      pos = input.value.length;
    }
  } else {
    let contador = 0;
    while (pos < input.value.length && contador < caracteresAntes) {
      if (/[\d,]/.test(input.value[pos])) {
        contador++;
      }
      pos++;
    }
  }
  input.setSelectionRange(pos, pos);

  actualizarDesdeInput(input.id);
}

function actualizarDesdeInput(inputId) {
  const inputActual = document.getElementById(inputId);
  if (!inputActual) return;
  const valorActual = parseValorFormateado(inputActual.value);

  let ves = 0;

  if (inputId === 'usd-input') {
    ves = valorActual * tasas.usdBcv;
  } else if (inputId === 'eur-input') {
    ves = valorActual * tasas.eurBcv;
  } else if (inputId === 'usdt-input') {
    ves = valorActual * tasas.usdt;
  } else if (inputId === 'ves-input') {
    ves = valorActual;
  }

  if (inputId !== 'ves-input' && inputVes) {
    inputVes.value = escribirFormateado(ves);
  }

  if (inputId !== 'usd-input' && inputUsd && tasas.usdBcv > 0) {
    inputUsd.value = escribirFormateado(ves / tasas.usdBcv);
  }

  if (inputId !== 'eur-input' && inputEur && tasas.eurBcv > 0) {
    inputEur.value = escribirFormateado(ves / tasas.eurBcv);
  }

  if (inputId !== 'usdt-input' && inputUsdt && tasas.usdt > 0) {
    inputUsdt.value = escribirFormateado(ves / tasas.usdt);
  }
}

function ajustarCantidad(inputId, cambio) {
  const inputActual = document.getElementById(inputId);
  if (!inputActual) return;
  const valorActual = parseValorFormateado(inputActual.value);
  const nuevoValor = Math.max(0, valorActual + cambio);

  inputActual.value = escribirFormateado(nuevoValor);
  actualizarDesdeInput(inputId);
}

function reiniciarAnimacion(elemento, clase) {
  if (!elemento) return;
  elemento.classList.remove(clase);
  void elemento.offsetWidth;
  elemento.classList.add(clase);
}

function mostrarToast(texto, esError = false) {
  if (!toast || !toastText) return;
  toastText.textContent = texto;
  toast.classList.toggle('toast--error', esError);
  toast.classList.add('toast--visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 1800);
}

function actualizarEstadoApi({ badge, weekday, day, meta, variant }) {
  if (estadoBadgeText) estadoBadgeText.textContent = badge;
  if (estadoWeekday) estadoWeekday.textContent = weekday;
  if (estadoDay) estadoDay.textContent = day;
  if (estadoMeta) estadoMeta.textContent = meta;

  if (estadoBadge) {
    estadoBadge.className = `status-dot api-status__badge--${variant}`;
    reiniciarAnimacion(estadoBadge, 'api-status__badge--pop');
  }

  if (estadoDay) {
    estadoDay.classList.remove('api-status__date-line--loading');
  }

  if (estadoApi) {
    reiniciarAnimacion(estadoApi, 'api-status__date--fade');
  }
}

function reiniciarCampo(inputId) {
  const inputActual = document.getElementById(inputId);
  if (!inputActual) return;
  inputActual.value = escribirFormateado(1);
  actualizarDesdeInput(inputId);
}

async function copiarInput(inputId) {
  const inputActual = document.getElementById(inputId);
  if (!inputActual) return;
  const boton = document.querySelector(`[data-input="${inputId}"][data-action="copy"]`);
  const texto = String(parseValorFormateado(inputActual.value));

  let copiado = false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      copiado = true;
    } catch {
      copiado = false;
    }
  }

  if (!copiado) {
    const textareaTemporal = document.createElement('textarea');
    textareaTemporal.value = texto;
    textareaTemporal.style.position = 'fixed';
    textareaTemporal.style.opacity = '0';
    document.body.appendChild(textareaTemporal);
    textareaTemporal.select();
    copiado = document.execCommand('copy');
    textareaTemporal.remove();
  }

  if (copiado && boton) {
    const iconoOriginal = boton.innerHTML;
    const labelOriginal = boton.getAttribute('aria-label');

    boton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
    boton.classList.add('icon-btn--copied');
    boton.setAttribute('aria-label', 'Copiado');

    setTimeout(() => {
      boton.innerHTML = iconoOriginal;
      boton.classList.remove('icon-btn--copied');
      boton.setAttribute('aria-label', labelOriginal);
    }, 1500);
  }

  mostrarToast(copiado ? 'Copiado al portapapeles' : 'No se pudo copiar', !copiado);
}

async function obtenerTasas() {
  try {
    const APIurl = 'https://churupos.vercel.app/api/tasas';

    const respuesta = await fetch(APIurl);
    const json = await respuesta.json();

    if (json.success) {
      tasas.usdBcv = json.data.usdBcv;
      tasas.eurBcv = json.data.eurBcv;
      tasas.usdt = json.data.usdt;

      // Actualizar badges de tasa en vivo en cada tarjeta
      if (rateUsd) rateUsd.textContent = `Tasa: Bs. ${escribirFormateado(tasas.usdBcv)}`;
      if (rateEur) rateEur.textContent = `Tasa: Bs. ${escribirFormateado(tasas.eurBcv)}`;
      if (rateUsdt) {
        const brecha = tasas.usdBcv > 0 ? ((tasas.usdt - tasas.usdBcv) / tasas.usdBcv) * 100 : 0;
        const signo = brecha >= 0 ? '+' : '';
        rateUsdt.textContent = `Tasa: Bs. ${escribirFormateado(tasas.usdt)} (${signo}${brecha.toFixed(1)}%)`;
      }
      if (rateSpread) {
        const brecha = tasas.usdBcv > 0 ? ((tasas.usdt - tasas.usdBcv) / tasas.usdBcv) * 100 : 0;
        const signo = brecha >= 0 ? '+' : '';
        rateSpread.textContent = `Brecha USDT: ${signo}${brecha.toFixed(1)}%`;
      }

      const lastUpdate = new Date(json.last_update);

      const weekday = lastUpdate.toLocaleDateString('es-VE', { weekday: 'long' });
      const day = lastUpdate.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const meta = `${lastUpdate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} · ${formatearHace(lastUpdate)}`;

      const desactualizado = Date.now() - lastUpdate.getTime() > UMBRAL_OBSOLETO_MS;

      actualizarEstadoApi({
        badge: desactualizado ? 'Posiblemente desactualizado' : 'Actualizado',
        weekday,
        day,
        meta,
        variant: desactualizado ? 'warning' : 'success'
      });

      inicializarCalculadora();
      habilitarInputs();
    } else {
      throw new Error('La API no devuelve éxito');
    }
  } catch (error) {
    console.error('Error al obtener tasas:', error);
    actualizarEstadoApi({
      badge: 'Sin conexión',
      weekday: '',
      day: 'No se pudo conectar con la API',
      meta: '',
      variant: 'error'
    });
  }
}

function inicializarCalculadora() {
  if (tasas.usdBcv <= 0) return;
  const valorBaseVes = 1 * tasas.usdBcv;

  if (inputUsd) inputUsd.value = escribirFormateado(1);
  if (inputVes) inputVes.value = escribirFormateado(valorBaseVes);
  if (inputEur && tasas.eurBcv > 0) inputEur.value = escribirFormateado(valorBaseVes / tasas.eurBcv);
  if (inputUsdt && tasas.usdt > 0) inputUsdt.value = escribirFormateado(valorBaseVes / tasas.usdt);
}

function habilitarInputs() {
  if (inputsHabilitados) return;
  inputsHabilitados = true;

  [inputUsd, inputUsdt, inputVes, inputEur].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', manejarEntrada);

    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        ajustarCantidad(input.id, 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        ajustarCantidad(input.id, -1);
      }
    });
  });

  document.querySelectorAll('.icon-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const inputId = button.dataset.input;
      const action = button.dataset.action;

      if (action === 'increment') {
        ajustarCantidad(inputId, 1);
      } else if (action === 'decrement') {
        ajustarCantidad(inputId, -1);
      } else if (action === 'reset') {
        reiniciarCampo(inputId);
      } else if (action === 'copy') {
        copiarInput(inputId);
      }
    });
  });

 
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('refresh-btn--spinning');
      try {
        await obtenerTasas();
        mostrarToast('Tasas actualizadas');
      } catch {
        mostrarToast('Error al actualizar tasas', true);
      } finally {
        setTimeout(() => refreshBtn.classList.remove('refresh-btn--spinning'), 600);
      }
    });
  }
}

obtenerTasas();
