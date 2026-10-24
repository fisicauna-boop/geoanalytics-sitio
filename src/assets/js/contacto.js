// Formulario de contacto (Web3Forms). Envía sin recargar la página y preselecciona el tema.
(function () {
  const form = document.getElementById("form-contacto");
  if (!form) return;
  const estado = form.querySelector(".formulario__estado");
  const select = form.querySelector("#f-servicio");

  // ?servicio=slug o ?tema=slug preseleccionan el tema de la consulta
  const p = new URLSearchParams(location.search);
  // ?detalle=... (desde el simulador) precarga el mensaje
  const msg = form.querySelector("#f-msg");
  if (p.get("detalle") && msg && !msg.value) msg.value = p.get("detalle") + "\n\n";
  const clave = p.get("servicio") || p.get("tema");
  if (clave && select) {
    const opt = [...select.options].find((o) => o.dataset.slug === clave);
    if (opt) select.value = opt.value;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.dataset.configurado !== "si") {
      estado.className = "formulario__estado error";
      estado.textContent = "El formulario todavía no está activado: falta la clave de Web3Forms en la configuración del sitio.";
      return;
    }
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    estado.className = "formulario__estado";
    estado.textContent = "Enviando consulta…";
    try {
      const datos = Object.fromEntries(new FormData(form));
      delete datos.redirect;
      const r = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(datos),
      });
      const j = await r.json();
      if (r.ok && j.success) {
        form.reset();
        estado.className = "formulario__estado ok";
        estado.textContent = "Consulta enviada. Le responderemos al correo indicado.";
      } else {
        throw new Error(j.message || "Error");
      }
    } catch (err) {
      estado.className = "formulario__estado error";
      estado.textContent = "La consulta no se envió. Revise su conexión e intente de nuevo.";
    } finally {
      boton.disabled = false;
    }
  });
})();
