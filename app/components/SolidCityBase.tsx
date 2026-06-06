import React from 'react';

export function SolidCityBase({ w = 100, d = 100 }: { w?: number; d?: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial 
          color="#0b0c10" 
          roughness={0.2} 
          metalness={0.8} 
        />
      </mesh>
      
      <gridHelper 
        args={[Math.max(w, d), Math.max(w, d) / 2, "#ff007f", "#00f3ff"]} 
         
         
      />
    </group>
  );
}
