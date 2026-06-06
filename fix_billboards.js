const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const regex = /function RepoBannerSign\(\{[\s\S]*?(?=function LandmarkRepoDisplay)/;

const newSign = `function RepoBannerSign({
    cell,
    glowColor,
    faceMounted = false,
}: {
    cell: Cell;
    glowColor: string;
    faceMounted?: boolean;
}) {
    const signRef = useRef<THREE.Group>(null);
    const screenMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const texture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 2048;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        const nextTexture = new THREE.CanvasTexture(canvas);
        nextTexture.anisotropy = 16;
        if (!context) return nextTexture;

        const displayName = cell.repo.name.length > 24 ? \`\${cell.repo.name.slice(0, 22)}...\` : cell.repo.name;
        const tickerText = \`  \${displayName.toUpperCase()}  ★  \`;
        
        context.fillStyle = "#060913";
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Inner grid lines for tech look
        context.strokeStyle = "rgba(255, 255, 255, 0.05)";
        context.lineWidth = 2;
        for (let i = 0; i < canvas.width; i += 32) {
            context.beginPath(); context.moveTo(i, 0); context.lineTo(i, canvas.height); context.stroke();
        }
        for (let i = 0; i < canvas.height; i += 32) {
            context.beginPath(); context.moveTo(0, i); context.lineTo(canvas.width, i); context.stroke();
        }

        context.font = "bold 110px monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = glowColor;
        context.shadowBlur = 40;
        context.fillStyle = "#ffffff";
        
        // Render repetitions for seamless scrolling
        const textWidth = context.measureText(tickerText).width;
        const step = Math.max(textWidth, 800);
        for (let x = step / 2; x < canvas.width * 2; x += step) {
            context.fillText(tickerText, x, canvas.height / 2 + 10);
            context.fillText(tickerText, x, canvas.height / 2 + 10); // draw twice for stronger glow
        }

        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.wrapS = THREE.RepeatWrapping;
        nextTexture.repeat.set(1, 1);
        nextTexture.needsUpdate = true;
        return nextTexture;
    }, [cell.repo.name, glowColor]);
    
    const panelWidth = faceMounted ? Math.max(cell.width * 2.4, 5.8) : Math.max(cell.width * 1.8, 4.4);
    const panelHeight = panelWidth * 0.15;
    const position: [number, number, number] = faceMounted
        ? [0, cell.height * 0.24, Math.max(cell.depth, 2.4)]
        : [0, cell.height / 2 + 1.2 + panelHeight / 2, 0];

    useEffect(() => () => texture.dispose(), [texture]);

    useFrame(({ clock }, delta) => {
        texture.offset.x = (clock.elapsedTime * 0.1) % 1;
        if (!faceMounted && signRef.current) {
            signRef.current.rotation.y += Math.min(delta, 0.05) * 0.22;
        }
        if (screenMaterialRef.current) {
            screenMaterialRef.current.opacity = 0.9 + Math.sin(clock.elapsedTime * 3.0) * 0.1;
        }
    });

    return (
        <group ref={signRef} position={position}>
            {!faceMounted ? (
                <group position={[0, -panelHeight / 2, 0]}>
                    <mesh position={[0, -0.6, 0]}>
                        <cylinderGeometry args={[0.08, 0.1, 1.2, 8]} />
                        <meshStandardMaterial color="#0f111a" roughness={0.7} metalness={0.8} />
                    </mesh>
                    <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.15, 0.02, 8, 16]} />
                        <meshBasicMaterial color={glowColor} toneMapped={false} />
                    </mesh>
                    <mesh position={[-panelWidth * 0.25, -0.4, 0]} rotation={[0, 0, -0.6]}>
                        <cylinderGeometry args={[0.03, 0.03, 1.0]} />
                        <meshStandardMaterial color="#212636" roughness={0.5} />
                    </mesh>
                    <mesh position={[panelWidth * 0.25, -0.4, 0]} rotation={[0, 0, 0.6]}>
                        <cylinderGeometry args={[0.03, 0.03, 1.0]} />
                        <meshStandardMaterial color="#212636" roughness={0.5} />
                    </mesh>
                </group>
            ) : null}
            
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[panelWidth + 0.15, panelHeight + 0.15, 0.1]} />
                <meshStandardMaterial color="#05070a" roughness={0.5} metalness={0.9} />
            </mesh>
            
            <mesh position={[0, panelHeight / 2 + 0.075, 0]}>
                <boxGeometry args={[panelWidth + 0.15, 0.02, 0.12]} />
                <meshBasicMaterial color={glowColor} toneMapped={false} />
            </mesh>
            <mesh position={[0, -panelHeight / 2 - 0.075, 0]}>
                <boxGeometry args={[panelWidth + 0.15, 0.02, 0.12]} />
                <meshBasicMaterial color={glowColor} toneMapped={false} />
            </mesh>

            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[panelWidth, panelHeight]} />
                <meshBasicMaterial
                    ref={screenMaterialRef}
                    map={texture}
                    transparent
                    opacity={1}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                />
            </mesh>
            <pointLight position={[0, 0, 0.6]} color={glowColor} intensity={1.2} distance={8} decay={2} />
        </group>
    );
}
`;

if (!regex.test(code)) {
    console.log("Could not find RepoBannerSign");
    process.exit(1);
}

code = code.replace(regex, newSign);
fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("RepoBannerSign replaced successfully.");
