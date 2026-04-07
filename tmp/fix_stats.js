const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'DELL', 'Desktop', 'ipl-predictor', 'stats_data.js');
let content = fs.readFileSync(filePath, 'utf8');

// We need to extract the object. 
// A quick way is to find everything after 'const IPL_STATS = ' and before the last ';'.
const startMarker = 'const IPL_STATS = ';
const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error('Could not find start marker');
    process.exit(1);
}

let objStr = content.substring(startIndex + startMarker.length).trim().replace(/;$/, '');

// FIX: some previous runs might have introduced pos": syntax errors. Clean them globally.
objStr = objStr.replace(/pos\":/g, 'pos:');

// Since it might have trailing commas and unquoted keys, eval is a shortcut for this internal tool
// (Alternative: JSON5, but we don't have it here).
let IPL_STATS;
try {
    IPL_STATS = eval('(' + objStr + ')');
} catch (e) {
    console.error('Eval failed:', e);
    process.exit(1);
}

// Sort every season
for (const year in IPL_STATS) {
    const fixKeys = (arr) => arr.map(p => {
        const newP = {};
        for (let k in p) newP[k.replace(/"/g, '')] = p[k];
        return newP;
    });

    IPL_STATS[year].orangeCap = fixKeys(IPL_STATS[year].orangeCap);
    IPL_STATS[year].purpleCap = fixKeys(IPL_STATS[year].purpleCap);

    // Orange Cap sorting
    IPL_STATS[year].orangeCap.sort((a, b) => {
        if (b.runs !== a.runs) return b.runs - a.runs;
        return (parseFloat(b.avg) || 0) - (parseFloat(a.avg) || 0);
    });
    IPL_STATS[year].orangeCap.forEach((p, i) => p.pos = i + 1);

    // Purple Cap sorting
    IPL_STATS[year].purpleCap.sort((a, b) => {
        if (b.wkts !== a.wkts) return b.wkts - a.wkts;
        return (parseFloat(a.econ) || 0) - (parseFloat(b.econ) || 0);
    });
    IPL_STATS[year].purpleCap.forEach((p, i) => p.pos = i + 1);
}

function formatCap(arr) {
    let lines = arr.map(p => {
        const entries = Object.entries(p).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
        return '      { ' + entries.join(', ') + ' },';
    });
    return '[\n' + lines.join('\n') + '\n    ]';
}

let newContent = '// ================================================================\n';
newContent += '// IPL HISTORICAL STATS (2008 - 2025) - [SORTED & CLEANED]\n';
newContent += '// ================================================================\n\n';
newContent += 'const IPL_STATS = {\n';

const years = Object.keys(IPL_STATS).sort((a, b) => a - b);
years.forEach((year, i) => {
    newContent += `  ${year}: {\n`;
    newContent += `    orangeCap: ${formatCap(IPL_STATS[year].orangeCap)},\n`;
    newContent += `    purpleCap: ${formatCap(IPL_STATS[year].purpleCap)}\n`;
    newContent += `  }${i === years.length - 1 ? '' : ','}\n`;
});

newContent += '};\n';

fs.writeFileSync(filePath, newContent);
console.log('Successfully updated stats_data.js with compact formatting');
