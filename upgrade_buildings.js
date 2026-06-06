const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

// 1. Add ClaimedGlow and FocusBeacon
const newComponents = `
function ClaimedGlow({ height, width, depth, accentColor }: any) {
    const radius = Math.max(width, depth) * 1.5;
    return (
        <group position={[0, -height / 2 + 0.1, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius * 0.8, radius, 32]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[radius, radius, 1, 32, 1, true]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.1} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
        </group>
    );
}

function FocusBeacon({ height, width, depth, accentColor }: any) {
    return (
        <group position={[0, height / 2, 0]}>
            {/* Core intense beam */}
            <mesh position={[0, 40, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 80, 16, 1, true]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Outer soft glow beam */}
            <mesh position={[0, 40, 0]}>
                <cylinderGeometry args={[1.2, 1.2, 80, 16, 1, true]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Floating energy rings around the beacon */}
            {Array.from({ length: 3 }).map((_, i) => (
                <mesh key={\`ring-\${i}\`} position={[0, 10 + i * 15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2.5 - i * 0.5, 0.1, 8, 32]} />
                    <meshBasicMaterial color={accentColor} transparent opacity={0.8} />
                </mesh>
            ))}
        </group>
    );
}
`;

// Insert new components right before MegaVerticalAd
code = code.replace('function createVerticalLedTexture', newComponents + '\nfunction createVerticalLedTexture');

// 2. Replace createVerticalLedTexture and MegaVerticalAd with user's version
const megaAdRegex = /function createVerticalLedTexture[\s\S]*?function BurjKhalifaAd[\s\S]*?\}\n/m;
code = code.replace(megaAdRegex, `function createVerticalLedTexture(text: string, color: string, bgColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2); // Text reads bottom-to-top
  
  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const cleanText = text.length > 25 ? text.substring(0, 22) + "..." : text;
  const fullText = \`\${cleanText}   ★   \${cleanText}   ★   \${cleanText}\`;
  ctx.fillText(fullText, 0, 0);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return { tex, needsScroll: true };
}

function MegaVerticalAd({ building, color }: { building: Cell; color: string }) {
  const { tex, needsScroll } = useMemo(
    () => createVerticalLedTexture(building.repo.name, color, "#000000"),
    [building.repo.name, color]
  );
  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#000000",
        emissiveMap: tex,
        emissive: "#ffffff",
        emissiveIntensity: 2.5,
        toneMapped: false,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      }),
    [tex]
  );
  useFrame(({ clock }) => {
    if (needsScroll) tex.offset.y = -(clock.elapsedTime * 0.12) % 1;
  });
  const { width, depth, height } = building;
  const panelW = width * 1.02; // Slightly wider to wrap the edge
  const panelH = height * 0.98; // Cover almost full height
  const y = 0; 
  const zOff = depth / 2 + 0.05;
  return (
    <group position={[0, y, zOff]}>
      {/* Black backing to block out normal windows */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#02030a" />
      </mesh>
      {/* Glowing Ad */}
      <mesh material={ledMat}>
        <planeGeometry args={[panelW, panelH]} />
      </mesh>
    </group>
  );
}
`);

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
