---
title: "Áreas de influencia: radios, isócronas y modelos de atracción"
antetitulo: Geoanalytics · Geomarketing aplicado
description: "Saber hasta dónde llega un local cambia decisiones de apertura, cobertura y competencia. Comparamos tres métodos para delimitar su mercado, con sus ventajas y límites, y un simulador del modelo de Huff."
date: 2026-10-13
actualizado: 2026-11-16
categoria: geomarketing
etiquetas: [Áreas de influencia, Modelo de Huff, Isócronas, Métodos]
escena_3d: areas
imagen: /media/portadas/areas-influencia-3d.webp
imagen_alt: "Ilustración 3D de un local en una ciudad conceptual atravesada por un río, con anillos de distancia a su alrededor."
indice: true
mapas_geo: true
mapas_red: true
serie: geomarketing
serie_titulo: Geomarketing aplicado
serie_orden: 2
servicios: [geomarketing-y-expansion-comercial]
enlaces:
  - titulo: "Huff, D. L. (1963). A Probabilistic Analysis of Shopping Center Trade Areas. Land Economics, 39(1), 81-90."
    url: https://doi.org/10.2307/3144521
  - titulo: OpenRouteService, cálculo de isócronas sobre datos de OpenStreetMap
    url: https://openrouteservice.org/
---

El **área de influencia** de un local es el territorio desde el que proviene la mayor parte de sus clientes. Delimitarla bien cambia decisiones concretas: **dónde abrir**, **cuánta población puede atender cada sucursal**, **dónde se superponen los locales propios** y **si un sitio nuevo le quitaría clientes a uno existente**.

Hay tres formas principales de hacerlo, de menor a mayor exigencia de datos. Elegir entre ellas no es un detalle técnico: según el método, el mismo local puede parecer que atiende mercados muy distintos.

<div class="decisiones-mini">

**Tres métodos, un mismo objetivo:** 1 · Radios de distancia → 2 · Isócronas de tiempo → 3 · Modelo de atracción de Huff.

</div>

## 1. Radios de distancia

La aproximación más simple traza un círculo de, por ejemplo, uno, dos o cinco kilómetros alrededor del local. Es rápida y fácil de explicar, pero supone que los clientes llegan en línea recta y en igualdad de condiciones desde cualquier dirección.

En la práctica, un río, una avenida sin cruces o una zona sin calles alteran mucho esa geometría. Los radios sirven para una primera mirada, no para decisiones finas.

## 2. Isócronas: tiempos de viaje

Una isócrona delimita el territorio desde el cual se llega al local en un tiempo dado, por ejemplo diez minutos en auto o quince minutos a pie. Se calcula sobre la red vial real, de modo que incorpora calles, sentidos de circulación y barreras.

Herramientas abiertas permiten calcularlas a partir de los datos de OpenStreetMap. Su principal límite es que no consideran la competencia: dos locales cercanos tendrán isócronas casi idénticas aunque en la realidad se repartan la clientela.

<figure class="mg" data-geo="radioiso" data-etiqueta="Mapa interactivo que compara el radio y la isócrona de un mismo local junto a un río.">
<div class="mapa-red__cab"><p class="mapa-red__titulo">Visualización 1 · Radio frente a isócrona</p><span class="mapa-red__sello">Datos simulados</span></div>
<div class="mg-pestanas" role="group" aria-label="Método"></div>
<div class="mg-cuerpo"><div class="mg-lienzo"></div></div>
<p class="mg-explica" aria-live="polite"></p>
<figcaption>Ciudad ficticia. Las celdas representan demanda estimada.</figcaption>
</figure>

Cuando hay varios locales propios, sus áreas pueden superponerse. Esa superposición es un dato del mapa; si los locales realmente compiten por los mismos clientes es otra pregunta, que desarrollamos en el artículo sobre [cómo evaluar una red de puntos de venta](/articulos/evaluar-una-red-de-puntos-de-venta/).

<figure class="mapa-red" data-mapa-red="superposicion" data-etiqueta="Mapa conceptual de superposición: dos áreas de influencia propias que se solapan.">
<div class="mapa-red__cab"><p class="mapa-red__titulo">Visualización 2 · Superposición territorial</p><span class="mapa-red__sello">Datos simulados</span></div>
<div class="mapa-red__lienzo"></div>
<ul class="mapa-red__ley"><li><i class="ml-sup"></i>Zona compartida entre dos locales propios</li></ul>
<figcaption>La zona resaltada indica un posible solapamiento. Confirmar si hay competencia interna requiere datos de clientes y ventas.</figcaption>
</figure>

## 3. Modelos de atracción: el modelo de Huff

Los modelos de atracción comercial reconocen que el consumidor **elige entre varias alternativas**. El más difundido es el **modelo de Huff** (1963), que estima la probabilidad de que un consumidor de una zona elija cada local en función de dos factores:

- el **atractivo** del local, habitualmente aproximado por su superficie de venta, y
- la **distancia** o el tiempo de viaje hasta él.

A diferencia de los radios y las isócronas, el área de influencia deja de ser una línea: cada zona reparte su probabilidad entre todos los locales disponibles, propios y de la competencia.

<div class="formula" role="math" aria-label="P sub i j igual a A sub j dividido d sub i j elevado a beta, sobre la suma en k de A sub k dividido d sub i k elevado a beta"><i>P</i><sub>ij</sub> =<span class="formula__frac"><span><i>A</i><sub>j</sub> / <i>d</i><sub>ij</sub><sup>β</sup></span><span>Σ<sub>k</sub> <i>A</i><sub>k</sub> / <i>d</i><sub>ik</sub><sup>β</sup></span></span></div>

<ul class="formula__leyenda">
<li><b>P<sub>ij</sub></b><span>probabilidad de que un consumidor de la zona <em>i</em> elija el local <em>j</em>;</span></li>
<li><b>A<sub>j</sub></b><span>atractivo del local, por ejemplo su superficie de venta;</span></li>
<li><b>d<sub>ij</sub></b><span>distancia o tiempo de viaje entre la zona y el local;</span></li>
<li><b>β</b><span>sensibilidad frente a la distancia: cuanto mayor es, más se penaliza ir lejos.</span></li>
</ul>

El denominador suma el mismo cociente para todos los locales *k* que el consumidor tiene como alternativa, de modo que las probabilidades suman uno.

### Un ejemplo hipotético

Supongamos un consumidor y tres locales ficticios: A, de 1.200 m² a 2 km; B, de 600 m² a 1 km; y C, de 300 m² a 0,5 km.

Con **β = 1**, el atractivo de cada local dividido por su distancia da el mismo valor (600 en los tres casos), por lo que el modelo asigna una probabilidad de un tercio a cada uno: 33,3 %. Con **β = 2**, la distancia pesa más: los cocientes pasan a ser 300, 600 y 1.200, y las probabilidades quedan en 14,3 % para A, 28,6 % para B y 57,1 % para C. El local más cercano concentra más de la mitad aunque sea el más chico.

<figure class="mg" data-geo="huff" data-etiqueta="Simulador del modelo de Huff para tres locales ficticios.">
<div class="mapa-red__cab"><p class="mapa-red__titulo">Visualización 3 · Simulador del modelo de Huff</p><span class="mapa-red__sello">Ejemplo hipotético</span></div>
<div class="mg-huff"></div>
<p class="mg-explica" aria-live="polite"></p>
<figcaption>Mueva el control para cambiar β. Las probabilidades se calculan con la fórmula de Huff sobre los tres locales ficticios del ejemplo (atractivo = superficie de venta).</figcaption>
</figure>

<div class="nota">

**El valor de β no puede elegirse a ojo.** Depende del tipo de producto (no se recorre la misma distancia para comprar pan que para comprar un electrodoméstico), del medio de transporte y de la región. Lo recomendable es calibrarlo con datos observados de clientes cuando existen.

</div>

## 4. Cuál elegir

| Método | Datos que exige | Considera competencia | Uso recomendado |
|---|---|---|---|
| Radios | Ubicación del local | No | Exploración inicial |
| Isócronas | Red vial | No | Accesibilidad y cobertura |
| Modelo de Huff | Locales, atractivo, red vial y demanda | Sí | Evaluación de sitios y canibalización |

Cuando la empresa cuenta con direcciones de clientes, conviene además dibujar el **área observada**: el territorio que efectivamente concentra, por ejemplo, el 70 % de los clientes de cada local. Compararla con el área teórica suele revelar barreras, hábitos de desplazamiento o competidores que el modelo no había captado.

<div class="cierre-comercial">

<p class="cierre-comercial__ante">Geoanalytics · Aplicación empresarial</p>

<p class="cierre-comercial__titulo">Delimitando mercados, identificando oportunidades.</p>

Comprender el área de influencia de un establecimiento permite evaluar mucho más que su proximidad geográfica. Permite interpretar la accesibilidad, la competencia, la capacidad de atracción y el potencial comercial de cada ubicación.

La elección entre radios, isócronas y modelos de atracción dependerá de la información disponible, las características del mercado y el nivel de precisión requerido.

En Geoanalytics integramos análisis geoespacial, estadística y modelos de localización para transformar información territorial en herramientas que respalden decisiones de expansión, cobertura y optimización de redes comerciales.

<p class="cierre-comercial__acciones"><strong>¿Necesita delimitar el mercado de sus locales?</strong> <a class="boton" href="/contacto/?servicio=geomarketing-y-expansion-comercial">Solicitar una propuesta →</a></p>

</div>
