---
# Copie este archivo en src/articulos/ con un nombre corto, en minúsculas y con guiones.
# Ese nombre será la dirección del artículo: src/articulos/mi-articulo.md -> /articulos/mi-articulo/
title: Título del artículo
description: Resumen de una o dos frases (idealmente menos de 160 caracteres).
date: 2026-11-01
# actualizado: 2026-12-01
categoria: geomarketing            # geomarketing | inteligencia-comercial | datos-y-mapas | opinion
etiquetas: [Etiqueta uno, Etiqueta dos]
imagen: /media/portadas/nombre-de-la-imagen.jpg
imagen_alt: Descripción de lo que muestra la imagen.
# imagen_credito: "Foto: Autor / Fuente"
destacado: false
borrador: true                     # cámbielo a false para publicar
servicios: [analisis-de-localizacion]
visualizaciones:
  - tipo: barras                   # barras | barras-horizontales | lineas | mapa | embebido
    titulo: Título del gráfico
    archivo: /media/datos/mis-datos.csv
    unidad: "%"
    nota: Aclaraciones sobre los datos.
    fuente: Institución, nombre del conjunto de datos, año.
enlaces:
  - titulo: Nombre de la fuente
    url: https://ejemplo.org
---

Primer párrafo: qué pregunta responde el artículo y por qué importa.

## Subtítulo principal

Texto del desarrollo.

### Subtítulo secundario

- Punto uno
- Punto dos

<div class="nota">

**Recuadro destacado.** Útil para advertencias metodológicas o definiciones.

</div>

| Columna | Columna |
|---|---|
| Dato | Dato |
