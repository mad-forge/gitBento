const fs = require('fs');
const content = fs.readFileSync('/Users/shashwat/gitBento/app/components/raw.txt', 'utf-8');

function extract(regex) {
  const match = content.match(regex);
  if (match) return match[0];
  return '';
}

const introFlyover = extract(/\/\/ ─── Intro Flyover ───[\s\S]*?(?=\/\/ ─── Rabbit Quest Flyover ───)/);
const rabbitFlyover = extract(/\/\/ ─── Rabbit Quest Flyover ───[\s\S]*?(?=\/\/ ─── Camera Focus \(controls OrbitControls target\) ───)/);
const cameraFocus = extract(/\/\/ ─── Camera Focus \(controls OrbitControls target\) ───[\s\S]*?(?=\/\/ ─── Mouse-Driven Flight ───)/);
const vehicleFlight = extract(/\/\/ ─── Mouse-Driven Flight ───[\s\S]*?(?=\/\/ ─── Sky Collectibles ───)/);
const skyCollectibles = extract(/\/\/ ─── Sky Collectibles ───[\s\S]*?(?=\/\/ ─── Main Canvas Component ───)/);

const out = `
import { useRef, useEffect, useEffectEvent, useState, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { VehicleMesh } from "./RaidSequence3D";

${introFlyover}
${rabbitFlyover}
${cameraFocus}
${vehicleFlight}
${skyCollectibles}

export { IntroFlyover, RabbitFlyover, CameraFocus, VehicleFlight, SkyCollectibles };
`;

fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', out);
console.log('Extraction complete');
