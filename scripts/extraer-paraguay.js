// Extrae el contorno de Paraguay de Natural Earth (dominio público, vía world-atlas)
// y lo guarda en src/assets/datos/paraguay.json para la escena 3D de la portada.
// Uso: node scripts/extraer-paraguay.js
import fs from "node:fs";
import { feature } from "topojson-client";

const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const py = feature(topo, topo.objects.countries).features.find((f) => f.id === "600");
if (!py) throw new Error("No se encontró Paraguay en el archivo");
const g = py.geometry;
const anillos = (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map((p) => p[0]);
const principal = anillos.sort((a, b) => b.length - a.length)[0]
  .map(([lon, lat]) => [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4]);
fs.writeFileSync("src/assets/datos/paraguay.json", JSON.stringify({
  fuente: "Natural Earth 1:50m (dominio público), vía world-atlas",
  asuncion: [-57.635, -25.282],
  contorno: principal,
}));
console.log("Puntos del contorno:", principal.length);
