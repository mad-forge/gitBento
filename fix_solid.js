const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/SolidCityBase.tsx', 'utf-8');

// Error is: Property 'opacity' does not exist on type ... for gridHelper
content = content.replace('opacity={0.15}', '');
content = content.replace('transparent={true}', '');

fs.writeFileSync('/Users/shashwat/gitBento/app/components/SolidCityBase.tsx', content);
console.log('Fixed SolidCityBase');
