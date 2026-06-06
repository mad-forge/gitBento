const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

// Fix vehicles
const oldVehicles = `const vehicles: AdVehicle[] = ["led_wrap", "rooftop_sign", "led_wrap", "billboard", "led_wrap", "rooftop_sign"];`;
const newVehicles = `const vehicles: AdVehicle[] = ["wall_mount", "wall_mount", "rooftop_sign", "wall_mount", "wall_mount", "rooftop_sign"];`;
code = code.replace(oldVehicles, newVehicles);

// Fix camera
const oldCamera = `        } else {
            defaultTarget.current.set(0, Math.max(cameraSpan * 0.06, sceneHeight * 0.28), 0);
            nextPosition.set(
                0,
                Math.max(cameraSpan * 0.25, sceneHeight * 0.52),
                Math.max(cameraSpan * 0.48, sceneHeight * 1.15),
            );
            if (perspectiveCamera) perspectiveCamera.fov = 40;
        }`;

const newCamera = `        } else {
            // Isometric/dynamic angle
            defaultTarget.current.set(0, sceneHeight * 0.35, 0);
            nextPosition.set(
                Math.max(cameraSpan * 0.45, sceneHeight * 0.8),
                Math.max(cameraSpan * 0.45, sceneHeight * 0.7),
                Math.max(cameraSpan * 0.65, sceneHeight * 1.2),
            );
            if (perspectiveCamera) perspectiveCamera.fov = 45;
        }`;

if (code.includes(oldCamera)) {
    code = code.replace(oldCamera, newCamera);
} else {
    console.log("Could not find camera code block.");
}

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("Updated camera angle and vehicles array");
