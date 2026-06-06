const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', 'utf-8');

// The original PlaneModel definition is:
// function PlaneModel({ type }: { type?: string }) {
//   const { scene } = useGLTF("/models/paper-plane.glb");
//   return (
//     <group scale={[3, 3, 3]} rotation={[0, Math.PI / 2, 0]}>
//       <primitive object={scene} />
//     </group>
//   );
// }
// useGLTF.preload("/models/paper-plane.glb");

const newPlaneModel = `
function PlaneModel({ type }: { type?: string }) {
  // A simple paper plane shaped mesh using a cone/tetrahedron
  return (
    <group scale={[2, 2, 4]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <coneGeometry args={[1, 2, 3]} />
        <meshStandardMaterial color="white" roughness={0.4} />
      </mesh>
    </group>
  );
}
`;

content = content.replace(/function PlaneModel\(\{ type \}: \{ type\?: string \}\) \{[\s\S]*?useGLTF\.preload\("\/models\/paper-plane\.glb"\);/, newPlaneModel.trim());

// If useGLTF was only imported for this, it might cause unused import warnings, but it's fine for now.

fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', content);
console.log('Fixed PlaneModel to avoid 404');
