const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

code = code.replace(
  `            <mesh position={[0, cell.height / 2 + 0.16, 0]} castShadow>
                <cylinderGeometry args={[1.45, 1.7, 0.3, 32]} />
                <meshStandardMaterial color="#070b15" emissive={glowColor} emissiveIntensity={0.18} roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh position={[0, -cell.height / 2 + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[baseWidth * 0.58, baseWidth * 0.76, 48]} />
                <meshBasicMaterial color={glowColor} transparent opacity={0.34} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
        </group>`,
  `            <mesh position={[0, cell.height / 2 + 0.16, 0]} castShadow>
                <cylinderGeometry args={[1.45, 1.7, 0.3, 32]} />
                <meshStandardMaterial color="#070b15" emissive={glowColor} emissiveIntensity={0.18} roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh position={[0, -cell.height / 2 + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[baseWidth * 0.58, baseWidth * 0.76, 48]} />
                <meshBasicMaterial color={glowColor} transparent opacity={0.34} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <RepoBannerSign cell={cell} glowColor={glowColor} faceMounted={cell.isHelipadTop} />
            {!cell.isHelipadTop && <LandmarkRepoDisplay cell={cell} glowColor={glowColor} />}
        </group>`
);

code = code.replace(
  `    const yOffset = cell.height / 2 + 0.72;`,
  `    const yOffset = cell.height / 2 + 0.34;`
);

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
