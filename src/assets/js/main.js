// Interacciones generales del sitio
(function () {
  // Menú en pantallas pequeñas
  const btn = document.querySelector(".menu-btn");
  const nav = document.getElementById("nav-principal");
  if (btn && nav) {
    btn.addEventListener("click", () => {
      const abierto = nav.classList.toggle("abierta");
      btn.setAttribute("aria-expanded", String(abierto));
      btn.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("abierta")) {
        nav.classList.remove("abierta");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }
    });
  }

  // Buscador rápido en el encabezado
  const lupa = document.querySelector("[data-abrir-busqueda]");
  const panel = document.querySelector(".busqueda-rapida");
  if (lupa && panel && !document.getElementById("form-buscar")) {
    lupa.addEventListener("click", (e) => {
      e.preventDefault();
      panel.hidden = !panel.hidden;
      lupa.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) panel.querySelector("input").focus();
    });
  }

  // Copiar enlace del artículo
  document.querySelectorAll("[data-copiar]").forEach((b) => {
    b.addEventListener("click", async () => {
      const texto = b.textContent;
      try {
        await navigator.clipboard.writeText(b.dataset.copiar);
        b.textContent = "Enlace copiado";
      } catch {
        b.textContent = "No se pudo copiar";
      }
      setTimeout(() => (b.textContent = texto), 2200);
    });
  });
})();
