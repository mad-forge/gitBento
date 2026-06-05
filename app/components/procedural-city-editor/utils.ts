import * as THREE from "three";

import type { Cell, StyleTheme, ZoneType } from "./types";

export const ROAD_SVG_SOURCE = `<?xml version="1.0" encoding="utf-8"?>
<svg width="800px" height="800px" viewBox="0 -0.5 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <path d="M14.0729979,0 L9.03234845,5.5313194e-08 L9.03234845,1.04200006 L7.958,1.042 L7.958,0 L3.083,0 L1.083,16 L16.005493,16 L14.0729979,0 Z M9,15 L8,15 L8,12 L9,12 L9,15 L9,15 Z M9,10.042 L8,10.042 L8,7 L9,7 L9,10.042 L9,10.042 Z M7.958,4.959 L7.958,2.959 L8.958,2.959 L8.958,4.959 L7.958,4.959 Z" fill="#434343"></path>
  </g>
</svg>`;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function seededNoise(seed: number, x: number, y: number) {
  const value = Math.sin((x * 127.1) + (y * 311.7) + (seed * 91.1)) * 43758.5453123;
  return value - Math.floor(value);
}

export function generateWindowTexture(seed: number, width: number, height: number) {
  const canvas = document.createElement("canvas");
  const cols = clamp(Math.round(width * 2.8), 4, 12);
  const rows = clamp(Math.round(height / 4.2), 8, 28);
  const cellWidth = 22;
  const cellHeight = 22;

  canvas.width = cols * cellWidth;
  canvas.height = rows * cellHeight;

  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  if (!context) return texture;

  const facadeTones = ["#1a1f28", "#171d26", "#1b222d", "#202733"];
  const baseTone = facadeTones[Math.floor(seededNoise(seed, 0.5, 0.5) * facadeTones.length)];
  const litChance = clamp(0.42 + seededNoise(seed, 4.2, 1.1) * 0.28, 0.38, 0.72);
  const windowColors = ["#ffd878", "#c9ecff", "#fff1b8", "#b7d9ff"];

  context.fillStyle = baseTone;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      const frameInsetX = 4 + Math.floor(seededNoise(seed + 17, row, col) * 2);
      const frameInsetY = 4 + Math.floor(seededNoise(seed + 31, col, row) * 2);
      const windowWidth = cellWidth - (frameInsetX * 2);
      const windowHeight = cellHeight - (frameInsetY * 2);
      const litNoise = seededNoise(seed, col + 1, row + 1);
      const tintNoise = seededNoise(seed + 91, row + 1, col + 1);
      const isLit = litNoise < litChance && seededNoise(seed + 211, row, col) > 0.16;

      context.fillStyle = seededNoise(seed + 301, row, col) > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.12)";
      context.fillRect(x, y, cellWidth, cellHeight);

      context.fillStyle = isLit
        ? windowColors[Math.floor(tintNoise * windowColors.length)]
        : (seededNoise(seed + 401, col, row) > 0.5 ? "#0b1118" : "#121922");
      context.fillRect(x + frameInsetX, y + frameInsetY, windowWidth, windowHeight);

      if (isLit) {
        context.fillStyle = "rgba(255,255,255,0.22)";
        context.fillRect(x + frameInsetX, y + frameInsetY, windowWidth, Math.max(1, Math.floor(windowHeight * 0.18)));
      }
    }
  }

  for (let row = 1; row < rows; row += 1) {
    context.fillStyle = "rgba(255,255,255,0.04)";
    context.fillRect(0, row * cellHeight, canvas.width, 1);
  }

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function generateDecorativeFacadeTexture(seed: number, width: number, height: number, baseColor: string, glowColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;

  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  if (!context) return texture;

  const base = new THREE.Color(baseColor);
  const facadeShade = `#${base.clone().multiplyScalar(0.86).getHexString()}`;
  const trimShade = `#${base.clone().multiplyScalar(1.06).getHexString()}`;
  const storefrontGlow = new THREE.Color(glowColor).multiplyScalar(1.25);
  const upperWindowColor = seededNoise(seed, width, height) > 0.5 ? "#d8efff" : "#ffd793";

  context.fillStyle = facadeShade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = trimShade;
  context.fillRect(0, 0, canvas.width, 10);
  context.fillRect(0, 104, canvas.width, 8);

  context.fillStyle = "#0a1119";
  context.fillRect(0, 112, canvas.width, 56);

  const bayCount = clamp(Math.round(width * 0.75), 2, 4);
  const bayWidth = Math.floor(canvas.width / bayCount);
  for (let index = 0; index < bayCount; index += 1) {
    const x = index * bayWidth;
    context.globalAlpha = 0.18 + seededNoise(seed + 17, index, 1) * 0.06;
    context.fillStyle = `#${storefrontGlow.getHexString()}`;
    context.fillRect(x + 8, 118, bayWidth - 16, 40);
    context.globalAlpha = 1;
    context.fillStyle = "#0c1620";
    context.fillRect(x + 14, 124, bayWidth - 28, 28);
  }

  const upperWindowCount = clamp(Math.round(height - 1), 1, 2);
  for (let index = 0; index < upperWindowCount; index += 1) {
    const lit = seededNoise(seed + 29, index, 1) > 0.34;
    context.fillStyle = lit ? upperWindowColor : "#111720";
    context.fillRect(32 + index * 70, 42, 28, 16);
  }

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function zoneColor(theme: StyleTheme, zone: ZoneType) {
  if (zone === "commercial") return [theme.commercialBase, theme.commercialGlow] as const;
  if (zone === "industrial") return [theme.industrialBase, theme.industrialGlow] as const;
  return [theme.residentialBase, theme.residentialGlow] as const;
}

export function createBuildingId(cell: Cell) {
  return `${cell.x}-${cell.z}`;
}
