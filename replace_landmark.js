const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const newLandmark = `function LandmarkBuildingShell({ cell, glowColor, theme }: { cell: Cell; glowColor: string; theme: StyleTheme }) {
    const facadeTexture = useMemo(
        () => generateWindowTexture(cell.seed + 4401, Math.max(cell.width * 2.2, cell.depth * 2.2), cell.height),
        [cell.depth, cell.height, cell.seed, cell.width],
    );
    const facadeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: "#030612",
        map: facadeTexture,
        emissiveMap: facadeTexture,
        emissive: new THREE.Color(glowColor),
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.9,
        toneMapped: false,
    }), [facadeTexture, glowColor]);

    useEffect(() => {
        return () => {
            facadeTexture.dispose();
            facadeMaterial.dispose();
        };
    }, [facadeMaterial, facadeTexture]);

    const baseW = Math.max(cell.width * 2.4, 5.8);
    const baseD = Math.max(cell.depth * 2.4, 5.8);

    return (
        <group>
            {/* Central Monolithic Core */}
            <mesh castShadow receiveShadow material={facadeMaterial}>
                <boxGeometry args={[baseW, cell.height, baseD]} />
            </mesh>
            
            {/* Outer Sci-Fi Shell Framework */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[baseW * 1.05, cell.height * 0.98, baseD * 1.05]} />
                <meshStandardMaterial color="#020305" wireframe opacity={0.15} transparent />
            </mesh>

            {/* Neon Corner Accents */}
            {[
                [-baseW/2, baseD/2], [baseW/2, baseD/2],
                [-baseW/2, -baseD/2], [baseW/2, -baseD/2]
            ].map(([x, z], i) => (
                <mesh key={\`corner-\${i}\`} position={[x, 0, z]}>
                    <cylinderGeometry args={[0.15, 0.15, cell.height, 4]} />
                    <meshBasicMaterial color={glowColor} transparent opacity={0.9} toneMapped={false} />
                </mesh>
            ))}

            {/* Floating Structural Belts */}
            {Array.from({ length: 4 }).map((_, i) => {
                const beltY = -cell.height / 2 + (cell.height / 4) * (i + 0.5);
                return (
                    <mesh key={\`belt-\${i}\`} position={[0, beltY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[Math.max(baseW, baseD) * 0.6, Math.max(baseW, baseD) * 0.75, 4]} />
                        <meshBasicMaterial color={glowColor} transparent opacity={0.25} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                );
            })}

            {/* Top crown structure */}
            <mesh position={[0, cell.height / 2 + 0.16, 0]} castShadow>
                <cylinderGeometry args={[1.45, 1.7, 0.3, 32]} />
                <meshStandardMaterial color="#070b15" emissive={glowColor} emissiveIntensity={0.18} roughness={0.2} metalness={0.9} />
            </mesh>

            {/* The user's requested components */}
            <ClaimedGlow height={cell.height} width={baseW} depth={baseD} accentColor={theme.accent} />
            <FocusBeacon height={cell.height} width={baseW} depth={baseD} accentColor={theme.accent} />
            <MegaVerticalAd building={{ ...cell, width: baseW, height: cell.height, depth: baseD }} color={theme.accent} />
        </group>
    );
}`;

const landmarkRegex = /function LandmarkBuildingShell[\s\S]*?\}\n/m;
code = code.replace(landmarkRegex, newLandmark + '\n');
fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
