const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', 'utf-8');

content = content.replace(
  'function PlaneModel() {',
  'function PlaneModel({ type }: { type?: string }) {'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', content);
console.log('Patched PlaneModel');
