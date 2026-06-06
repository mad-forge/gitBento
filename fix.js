const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', 'utf-8');

// Replace VehicleMesh import and usage with PlaneModel
content = content.replace(/import \{ VehicleMesh \} from "\.\/RaidSequence3D";/g, 'import { useGLTF } from "@react-three/drei";\nfunction PlaneModel() {\n  const { scene } = useGLTF("/models/paper-plane.glb");\n  return (\n    <group scale={[3, 3, 3]} rotation={[0, Math.PI / 2, 0]}>\n      <primitive object={scene} />\n    </group>\n  );\n}\nuseGLTF.preload("/models/paper-plane.glb");');
content = content.replace(/<VehicleMesh type=\{vehicleType\} \/>/g, '<PlaneModel />');

// Remove types that don't exist
content = content.replace(/import type \{ CityPlaza \} from "@\/lib\/github";/g, '');
content = content.replace(/import type \{ PendingRespawn, SelfPvpState \} from "@\/lib\/useFlyPresence";/g, '');

// Fix missing types
content = content.replace(/plazas: CityPlaza\[\]/g, 'plazas: any[]');
content = content.replace(/React.MutableRefObject<PendingRespawn \| null>/g, 'any');
content = content.replace(/React.MutableRefObject<SelfPvpState>/g, 'any');

fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', content);
console.log('Fixed dependencies');
