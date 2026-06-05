"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { clamp, seededNoise } from "../utils";

export function GrassStrip({
  width,
  depth,
  seed,
  density = 180,
}: {
  width: number;
  depth: number;
  seed: number;
  density?: number;
}) {
  const bladeCount = clamp(Math.round(width * depth * density), 45, 180);
  const grassGeometry = useMemo(() => {
    const firstBlade = new THREE.PlaneGeometry(0.065, 0.28);
    firstBlade.translate(0, 0.14, 0);
    const secondBlade = firstBlade.clone();
    secondBlade.rotateY(Math.PI / 2);
    const geometry = new THREE.BufferGeometry();
    const firstPosition = firstBlade.getAttribute("position");
    const secondPosition = secondBlade.getAttribute("position");
    const firstUv = firstBlade.getAttribute("uv");
    const secondUv = secondBlade.getAttribute("uv");
    const positions = new Float32Array(firstPosition.count * 3 + secondPosition.count * 3);
    const uvs = new Float32Array(firstUv.count * 2 + secondUv.count * 2);

    positions.set(firstPosition.array as Float32Array, 0);
    positions.set(secondPosition.array as Float32Array, firstPosition.count * 3);
    uvs.set(firstUv.array as Float32Array, 0);
    uvs.set(secondUv.array as Float32Array, firstUv.count * 2);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
    firstBlade.dispose();
    secondBlade.dispose();
    return geometry;
  }, []);
  const grassMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    }),
    [],
  );
  const matrices = useMemo(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    return Array.from({ length: bladeCount }, (_, index) => {
      position.set(
        (seededNoise(seed, index, 1) - 0.5) * width,
        0,
        (seededNoise(seed, index, 2) - 0.5) * depth,
      );
      rotation.set(
        (seededNoise(seed, index, 3) - 0.5) * 0.36,
        seededNoise(seed, index, 4) * Math.PI,
        (seededNoise(seed, index, 5) - 0.5) * 0.42,
      );
      const bladeScale = 1 + seededNoise(seed, index, 6) * 1.15;
      scale.set(1.35 + seededNoise(seed, index, 7) * 0.9, bladeScale, 1);
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      return matrix.clone();
    });
  }, [bladeCount, depth, seed, width]);
  const colors = useMemo(() => {
    const palette = ["#66c85a", "#7adf68", "#8eea78", "#a4f08a"];
    return Array.from({ length: bladeCount }, (_, index) => {
      const color = new THREE.Color(palette[Math.floor(seededNoise(seed, index, 8) * palette.length)]);
      color.multiplyScalar(0.9 + seededNoise(seed, index, 9) * 0.3);
      return color;
    });
  }, [bladeCount, seed]);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    matrices.forEach((matrix, index) => {
      meshRef.current?.setMatrixAt(index, matrix);
      meshRef.current?.setColorAt(index, colors[index]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [colors, matrices]);

  return (
    <instancedMesh ref={meshRef} args={[grassGeometry, grassMaterial, bladeCount]} />
  );
}
