const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const oldVehicles = `const vehicles: AdVehicle[] = ["billboard", "rooftop_sign", "billboard", "rooftop_sign", "billboard", "rooftop_sign"];`;
const newVehicles = `const vehicles: AdVehicle[] = ["led_wrap", "rooftop_sign", "led_wrap", "billboard", "led_wrap", "rooftop_sign"];`;

if (!code.includes(oldVehicles)) {
    console.log("Could not find vehicles array");
    process.exit(1);
}

code = code.replace(oldVehicles, newVehicles);
fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("Updated vehicles array successfully.");
