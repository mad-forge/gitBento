const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const oldStart = `function BuildingShell({
    cell,
    bounds,
    theme,
    isPrestigeTower = false,
}: {
    cell: Cell;
    bounds: CityModel["bounds"];
    theme: StyleTheme;
    isPrestigeTower?: boolean;
}) {
    const emissiveColor = TOKYO_NIGHT.windowGlow;`;

const newStart = `function BuildingShell({
    cell,
    bounds,
    theme,
    isPrestigeTower = false,
}: {
    cell: Cell;
    bounds: CityModel["bounds"];
    theme: StyleTheme;
    isPrestigeTower?: boolean;
}) {
    const buildingShape = useMemo(() => seededNoise(888, cell.worldX, cell.worldZ) > 0.85 ? "cylinder" : "box", [cell.worldX, cell.worldZ]);
    const emissiveColor = TOKYO_NIGHT.windowGlow;`;

if (code.includes(oldStart)) {
    code = code.replace(oldStart, newStart);
} else {
    console.log("Could not find BuildingShell start");
    process.exit(1);
}

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("Fixed BuildingShell definition");
