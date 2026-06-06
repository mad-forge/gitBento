const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

// 1. Fix the CameraDirector
const oldCamera = `            // Isometric/dynamic angle
            defaultTarget.current.set(0, sceneHeight * 0.35, 0);
            nextPosition.set(
                Math.max(cameraSpan * 0.45, sceneHeight * 0.8),
                Math.max(cameraSpan * 0.45, sceneHeight * 0.7),
                Math.max(cameraSpan * 0.65, sceneHeight * 1.2),
            );
            if (perspectiveCamera) perspectiveCamera.fov = 45;`;

const newCamera = `            // Isometric/dynamic angle
            defaultTarget.current.set(0, sceneHeight * 0.45, 0);
            nextPosition.set(
                Math.max(cameraSpan * 0.55, sceneHeight * 1.1),
                Math.max(cameraSpan * 0.5, sceneHeight * 1.0),
                Math.max(cameraSpan * 0.8, sceneHeight * 1.5),
            );
            if (perspectiveCamera) perspectiveCamera.fov = 50;`;

if (code.includes(oldCamera)) {
    code = code.replace(oldCamera, newCamera);
} else {
    console.log("Could not find camera code block.");
}

// 2. Add building style variation
const oldBuildingMeshStart = `function BuildingMesh({ cell, bounds, theme, isPrestigeTower = false }: { cell: Cell; bounds: CityModel["bounds"]; theme: StyleTheme; isPrestigeTower?: boolean }) {`;
const newBuildingMeshStart = `function BuildingMesh({ cell, bounds, theme, isPrestigeTower = false }: { cell: Cell; bounds: CityModel["bounds"]; theme: StyleTheme; isPrestigeTower?: boolean }) {
    const buildingShape = useMemo(() => seededNoise(888, cell.worldX, cell.worldZ) > 0.85 ? "cylinder" : "box", [cell.worldX, cell.worldZ]);
`;
if (code.includes(oldBuildingMeshStart)) {
    code = code.replace(oldBuildingMeshStart, newBuildingMeshStart);
}

const oldGeomLower = `<boxGeometry args={[cell.width, silhouette.lowerHeight, cell.depth]} />`;
const newGeomLower = `{buildingShape === "cylinder" ? <cylinderGeometry args={[Math.max(cell.width, cell.depth)/2, Math.max(cell.width, cell.depth)/2, silhouette.lowerHeight, 16]} /> : <boxGeometry args={[cell.width, silhouette.lowerHeight, cell.depth]} />}`;
code = code.replace(oldGeomLower, newGeomLower);

const oldGeomMiddle = `<boxGeometry args={[cell.width * silhouette.middleScale, silhouette.middleHeight, cell.depth * (silhouette.middleScale + 0.04)]} />`;
const newGeomMiddle = `{buildingShape === "cylinder" ? <cylinderGeometry args={[Math.max(cell.width, cell.depth) * silhouette.middleScale / 2, Math.max(cell.width, cell.depth) * silhouette.middleScale / 2, silhouette.middleHeight, 16]} /> : <boxGeometry args={[cell.width * silhouette.middleScale, silhouette.middleHeight, cell.depth * (silhouette.middleScale + 0.04)]} />}`;
code = code.replace(oldGeomMiddle, newGeomMiddle);

const oldGeomCrown = `<boxGeometry args={[cell.width * silhouette.topScale, silhouette.crownHeight, cell.depth * Math.max(0.5, silhouette.topScale - 0.02)]} />`;
const newGeomCrown = `{buildingShape === "cylinder" ? <cylinderGeometry args={[Math.max(cell.width, cell.depth) * silhouette.topScale / 2, Math.max(cell.width, cell.depth) * silhouette.topScale / 2, silhouette.crownHeight, 16]} /> : <boxGeometry args={[cell.width * silhouette.topScale, silhouette.crownHeight, cell.depth * Math.max(0.5, silhouette.topScale - 0.02)]} />}`;
code = code.replace(oldGeomCrown, newGeomCrown);

// Hide some boxy side fins if it's a cylinder
const oldFins = `{[1, -1].map((side) => (
                          <mesh
                              key={\`fin-x-\${side}\`}
                              position={[
                                  side * cell.width * 0.56,
                                  (-cell.height / 2) + (silhouette.sideFinHeight / 2) + cell.height * 0.08,
                                  cell.depth * 0.02,
                              ]}
                              castShadow
                          >
                              <boxGeometry args={[0.08, silhouette.sideFinHeight, cell.depth * 0.74]} />`;

const newFins = `{[1, -1].map((side) => ( buildingShape !== "cylinder" && 
                          <mesh
                              key={\`fin-x-\${side}\`}
                              position={[
                                  side * cell.width * 0.56,
                                  (-cell.height / 2) + (silhouette.sideFinHeight / 2) + cell.height * 0.08,
                                  cell.depth * 0.02,
                              ]}
                              castShadow
                          >
                              <boxGeometry args={[0.08, silhouette.sideFinHeight, cell.depth * 0.74]} />`;
code = code.replace(oldFins, newFins);

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("Updated camera and building styles.");
