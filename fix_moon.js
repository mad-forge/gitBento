const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

// 1. Fix HelipadTop fog
const helipadMaterial = `<meshBasicMaterial
                    color={theme.accent}
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                />`;
const newHelipadMaterial = `<meshBasicMaterial
                    color={theme.accent}
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                    fog={false}
                />`;
code = code.replace(helipadMaterial, newHelipadMaterial);

// 2. Add RealisticMoon component right before CityScene
const realisticMoonComponent = `function RealisticMoon() {
    const moonTex = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;
        
        // Base color
        ctx.fillStyle = "#e8e9f2";
        ctx.fillRect(0, 0, 512, 512);
        
        // Draw craters
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = 10 + Math.pow(Math.random(), 2.5) * 60;
            
            const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
            g.addColorStop(0, "rgba(180, 180, 195, 0.7)");
            g.addColorStop(1, "rgba(232, 233, 242, 0)");
            
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Noise
        const imgData = ctx.getImageData(0, 0, 512, 512);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 15;
            imgData.data[i] += noise;
            imgData.data[i+1] += noise;
            imgData.data[i+2] += noise;
        }
        ctx.putImageData(imgData, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        return tex;
    }, []);

    return (
        <group>
            <mesh rotation={[0, Math.PI / 4, 0]}>
                <sphereGeometry args={[6, 64, 64]} />
                <meshBasicMaterial map={moonTex} toneMapped={false} fog={false} />
            </mesh>
            <mesh>
                <sphereGeometry args={[6.8, 32, 32]} />
                <meshBasicMaterial color="#d8b4fe" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
            </mesh>
            <mesh>
                <sphereGeometry args={[8.5, 32, 32]} />
                <meshBasicMaterial color="#8855ff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
            </mesh>
        </group>
    );
}

function CityScene`;
code = code.replace('function CityScene', realisticMoonComponent);

// 3. Replace the old Moon spheres in CityScene
const oldMoonStr = `<group position={[model.bounds.width * 0.8, 35, -Math.max(model.bounds.depth, 60) * 1.8]}>
              <Sphere args={[6, 64, 64]}>
                  <meshBasicMaterial color={TOKYO_NIGHT.moon} toneMapped={false} fog={false} />
              </Sphere>
              <Sphere args={[6.8, 32, 32]}>
                  <meshBasicMaterial
                      color={TOKYO_NIGHT.moonGlow}
                      transparent
                      opacity={0.15}
                      blending={THREE.AdditiveBlending}
                      depthWrite={false}
                      toneMapped={false}
                      fog={false}
                  />
              </Sphere>
              <Sphere args={[8.5, 32, 32]}>
                  <meshBasicMaterial
                      color={TOKYO_NIGHT.neonPurple}
                      transparent
                      opacity={0.08}
                      blending={THREE.AdditiveBlending}
                      depthWrite={false}
                      toneMapped={false}
                      fog={false}
                  />
              </Sphere>
          </group>`;
const newMoonStr = `<group position={[model.bounds.width * 0.8, 35, -Math.max(model.bounds.depth, 60) * 1.8]}>
              <RealisticMoon />
          </group>`;
code = code.replace(oldMoonStr, newMoonStr);

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
