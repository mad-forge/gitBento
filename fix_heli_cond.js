const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// Always add helipad to the tallest building
content = content.replace('if (activeRepos.length >= 15) {', 'if (cells.length > 0) {');

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed helipad condition');
