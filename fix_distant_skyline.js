const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const regex = /function DistantSkyline\(\{ bounds, theme \}: \{ bounds: CityModel\["bounds"\]; theme: StyleTheme \}\) \{[\s\S]*?(?=function TrafficSignal)/;

const newDistantSkyline = `function DistantSkyline({ bounds, theme }: { bounds: CityModel["bounds"]; theme: StyleTheme }) {
    const span = Math.max(bounds.width, bounds.depth);

    const { towerMatrices, windowMatrices, antennaMatrices, windowColors, antennaColors } = useMemo(() => {
        const dummy = new THREE.Object3D();
        const tMatrices: THREE.Matrix4[] = [];
        const wMatrices: THREE.Matrix4[] = [];
        const aMatrices: THREE.Matrix4[] = [];
        
        const wColors: number[] = [];
        const aColors: number[] = [];

        const colorCyan = new THREE.Color(TOKYO_NIGHT.neonCyan);
        const colorRoad = new THREE.Color(theme.roadGlow);

        for (let cluster = 0; cluster < 24; cluster++) {
            const clusterAngle = (cluster / 24) * Math.PI * 2;
            const clusterRadius = span * 1.9;

            for (let i = 0; i < 45; i++) {
                const seed = cluster * 100 + i;
                const localAngle = clusterAngle + (seededNoise(801, seed, 1) - 0.5) * 0.9;
                const localDist = clusterRadius + seededNoise(802, seed, 2) * span * 1.4;

                const x = Math.cos(localAngle) * localDist;
                const z = Math.sin(localAngle) * localDist;

                const height = 10.0 + Math.pow(seededNoise(803, seed, 3), 2) * 50.0;
                const width = 1.8 + seededNoise(804, seed, 4) * 4.0;
                const depth = 1.8 + seededNoise(805, seed, 5) * 4.0;
                const isCyan = seededNoise(806, seed, 6) > 0.5;
                const glowColor = isCyan ? colorCyan : colorRoad;

                // Tower
                dummy.position.set(x, height / 2 - 0.04, z);
                dummy.scale.set(width, height, depth);
                dummy.updateMatrix();
                tMatrices.push(dummy.matrix.clone());

                // Windows
                const numWindows = clamp(Math.round(height / 4), 2, 10);
                for (let row = 0; row < numWindows; row++) {
                    const wx = x + (seededNoise(791, seed, row) - 0.5) * width * 0.4;
                    const wy = (height / 2 - 0.04) - height * 0.34 + row * Math.max(0.8, height * 0.1);
                    const wz = z + (depth / 2) + 0.012;
                    
                    dummy.position.set(wx, wy, wz);
                    dummy.scale.set(width * 0.42, 0.07, 0.025);
                    dummy.updateMatrix();
                    wMatrices.push(dummy.matrix.clone());
                    wColors.push(glowColor.r, glowColor.g, glowColor.b);
                }

                // Antenna
                if (seededNoise(792, seed, 1) > 0.3) {
                    dummy.position.set(x, height - 0.04 + 0.5, z);
                    dummy.scale.set(0.04, 1.0, 0.04);
                    dummy.updateMatrix();
                    aMatrices.push(dummy.matrix.clone());
                    aColors.push(glowColor.r, glowColor.g, glowColor.b);
                }
            }
        }
        
        return { 
            tMatrices, 
            wMatrices, 
            aMatrices, 
            wColors: new Float32Array(wColors),
            aColors: new Float32Array(aColors)
        };
    }, [span, theme.roadGlow]);

    const tRef = useRef<THREE.InstancedMesh>(null);
    const wRef = useRef<THREE.InstancedMesh>(null);
    const aRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        if (tRef.current) {
            towerMatrices.forEach((mat, i) => tRef.current!.setMatrixAt(i, mat));
            tRef.current.instanceMatrix.needsUpdate = true;
        }
        if (wRef.current) {
            windowMatrices.forEach((mat, i) => wRef.current!.setMatrixAt(i, mat));
            wRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(windowColors, 3));
            wRef.current.instanceMatrix.needsUpdate = true;
        }
        if (aRef.current) {
            antennaMatrices.forEach((mat, i) => aRef.current!.setMatrixAt(i, mat));
            aRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(antennaColors, 3));
            aRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [towerMatrices, windowMatrices, antennaMatrices, windowColors, antennaColors]);

    return (
        <group>
            {towerMatrices.length > 0 && (
                <instancedMesh ref={tRef} args={[null as any, null as any, towerMatrices.length]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#050713" emissive="#100724" emissiveIntensity={0.12} roughness={0.38} metalness={0.68} />
                </instancedMesh>
            )}
            {windowMatrices.length > 0 && (
                <instancedMesh ref={wRef} args={[null as any, null as any, windowMatrices.length]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial vertexColors transparent opacity={0.62} toneMapped={false} />
                </instancedMesh>
            )}
            {antennaMatrices.length > 0 && (
                <instancedMesh ref={aRef} args={[null as any, null as any, antennaMatrices.length]}>
                    <cylinderGeometry args={[1, 1, 1, 5]} />
                    <meshBasicMaterial vertexColors transparent opacity={0.7} toneMapped={false} />
                </instancedMesh>
            )}
        </group>
    );
}

`;

if (!regex.test(code)) {
    console.log("Could not find DistantSkyline");
    process.exit(1);
}

code = code.replace(regex, newDistantSkyline);
fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("DistantSkyline replaced successfully.");
