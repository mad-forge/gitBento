"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { Cell, CityStyle } from "../types";
import { generateDecorativeFacadeTexture, generateWindowTexture } from "../utils";

export function BuildingShell({
  cell,
  baseColor,
  glowColor,
  cityStyle,
}: {
  cell: Cell;
  baseColor: string;
  glowColor: string;
  cityStyle: CityStyle;
}) {
  const facadeTexture = useMemo(
    () => cell.isDecorative
      ? generateDecorativeFacadeTexture(cell.seed, cell.width, cell.height, baseColor, glowColor)
      : generateWindowTexture(cell.seed, Math.max(cell.width, cell.depth), cell.height),
    [baseColor, cell.depth, cell.height, cell.isDecorative, cell.seed, cell.width, glowColor],
  );

  const buildingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: facadeTexture,
      emissiveMap: facadeTexture,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: cell.isDecorative
        ? (cityStyle === "cyberpunk" ? 2.15 : 1.5)
        : (cityStyle === "cyberpunk" ? 2.35 : cityStyle === "tokyo-dense" ? 2.05 : 1.55),
      roughness: cell.isDecorative ? 0.7 : cityStyle === "cyberpunk" ? 0.42 : cityStyle === "modern-glass" ? 0.28 : 0.72,
      metalness: cell.isDecorative ? 0.16 : cityStyle === "cyberpunk" ? 0.44 : cityStyle === "modern-glass" ? 0.78 : 0.18,
    });
  }, [cell.isDecorative, cityStyle, facadeTexture, glowColor]);

  useEffect(() => () => buildingMaterial.dispose(), [buildingMaterial]);
  useEffect(() => () => facadeTexture.dispose(), [facadeTexture]);

  return (
    <mesh castShadow receiveShadow material={buildingMaterial}>
      <boxGeometry args={[cell.width, cell.height, cell.depth]} />
    </mesh>
  );
}
