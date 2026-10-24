---
title: "Áreas de influencia: radios, isócronas y modelos de atracción"
description: Tres formas de responder hasta dónde llega un local, con sus ventajas y límites, y un ejemplo hipotético del modelo de Huff para ver cómo cambian los resultados según los supuestos.
date: 2026-10-13
categoria: geomarketing
etiquetas: [Áreas de influencia, Modelo de Huff, Isócronas, Métodos]
imagen: /media/portadas/areas-de-influencia.webp
imagen_alt: Ilustración 3D de dos locales sobre una trama de calles, cada uno con áreas de influencia escalonadas.
servicios: [areas-de-influencia-y-cobertura, analisis-de-localizacion]
visualizaciones:
  - tipo: barras
    titulo: "Ejemplo hipotético: probabilidad de elegir cada local según el parámetro de fricción de la distancia (β)"
    archivo: /media/datos/ejemplo-huff.csv
    unidad: "%"
    nota: Datos ficticios con fines didácticos. Atractivo medido como superficie de venta (α = 1).
    fuente: Elaboración propia con la fórmula del modelo de Huff.
enlaces:
  - titulo: "Huff, D. L. (1963). A Probabilistic Analysis of Shopping Center Trade Areas. Land Economics, 39(1), 81-90."
    url: https://doi.org/10.2307/3144521
  - titulo: OpenRouteService, cálculo de isócronas sobre datos de OpenStreetMap
    url: https://openrouteservice.org/
---

El **área de influencia** de un local es el territorio desde el que proviene la mayor parte de sus clientes. Delimitarla es el primer paso de casi cualquier análisis de geomarketing: permite estimar la población que un local puede atender, detectar superposiciones entre sucursales y evaluar si un sitio nuevo le quitaría clientes a uno existente.

Hay tres formas principales de hacerlo, de menor a mayor exigencia de datos.

## 1. Radios de distancia

La aproximación más simple traza un círculo de, por ejemplo, uno, dos o cinco kilómetros alrededor del local. Es rápida y fácil de explicar, pero supone que los clientes llegan en línea recta y en igualdad de condiciones desde cualquier dirección.

En la práctica, un río, una avenida sin cruces o una zona sin calles alteran mucho esa geometría. Los radios sirven para una primera mirada, no para decisiones finas.

## 2. Isócronas: tiempos de viaje

Una isócrona delimita el territorio desde el cual se llega al local en un tiempo dado, por ejemplo diez minutos en auto o quince minutos a pie. Se calcula sobre la red vial real, de modo que incorpora calles, sentidos de circulación y barreras.

Herramientas abiertas permiten calcularlas a partir de los datos de OpenStreetMap. Su principal límite es que no consideran la competencia: dos locales cercanos tendrán isócronas casi idénticas aunque en la realidad se repartan la clientela.

## 3. Modelos de atracción: el modelo de Huff

Los modelos de atracción comercial reconocen que el consumidor elige entre varias alternativas. El más difundido es el **modelo de Huff** (1963), que estima la probabilidad de que un consumidor de una zona elija cada local en función de dos factores:

- el **atractivo** del local, habitualmente aproximado por su superficie de venta, y
- la **distancia** o el tiempo de viaje hasta él.

La probabilidad de elegir el local *j* es proporcional a su atractivo dividido por la distancia elevada a un exponente β, y se normaliza para que la suma entre todos los locales sea uno. El parámetro β mide cuánto pesa la distancia: cuanto mayor es, más se penaliza ir lejos.

### Un ejemplo hipotético

Supongamos un consumidor y tres locales ficticios:

| Local | Superficie de venta | Distancia al consumidor |
|---|---|---|
| A | 1.200 m² | 2 km |
| B | 600 m² | 1 km |
| C | 300 m² | 0,5 km |

Con **β = 1**, el atractivo de cada local dividido por su distancia da el mismo valor (600 en los tres casos), por lo que el modelo asigna una probabilidad de un tercio a cada uno. Con **β = 2**, la distancia pesa más: el local C, el más cercano, concentra más de la mitad de la probabilidad y el local A, el más grande, cae a alrededor de un séptimo.

<div class="nota">

El ejemplo muestra por qué el valor de β no puede elegirse a ojo. Depende del tipo de producto (no se recorre la misma distancia para comprar pan que para comprar un electrodoméstico), del medio de transporte y de la región. Lo recomendable es calibrarlo con datos observados de clientes cuando existen.

</div>

## Cuál elegir

| Método | Datos que exige | Considera competencia | Uso recomendado |
|---|---|---|---|
| Radios | Ubicación del local | No | Exploración inicial |
| Isócronas | Red vial | No | Accesibilidad y cobertura |
| Modelo de Huff | Locales, atractivo, red vial y demanda | Sí | Evaluación de sitios y canibalización |

Cuando la empresa cuenta con direcciones de clientes, conviene además dibujar el **área observada**: el territorio que efectivamente concentra, por ejemplo, el 70 % de los clientes de cada local. Compararla con el área teórica suele revelar barreras, hábitos de desplazamiento o competidores que el modelo no había captado.
