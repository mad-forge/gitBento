const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const oldMountainProfile = `const ringProfile = [
                { y: 0, radius: 1 },
                { y: 0.16, radius: 0.79 },
                { y: 0.37, radius: 0.63 },
                { y: 0.58, radius: 0.44 },
                { y: 0.77, radius: 0.27 },
                { y: 0.91, radius: 0.12 },
            ];`;

const newMountainProfile = `const ringProfile = [
                { y: 0, radius: 1 },
                { y: 0.2, radius: 0.75 },
                { y: 0.4, radius: 0.5 },
                { y: 0.6, radius: 0.3 },
                { y: 0.8, radius: 0.15 },
                { y: 0.95, radius: 0.05 },
            ];`;

code = code.replace(oldMountainProfile, newMountainProfile);

// Also add more jaggedness
const oldJaggedness = `const roughVariation = (seededNoise(seed, ringIndex, segment) - 0.5) * 0.16;`;
const newJaggedness = `const roughVariation = (seededNoise(seed, ringIndex, segment) - 0.5) * 0.35;`;
code = code.replace(oldJaggedness, newJaggedness);

fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
