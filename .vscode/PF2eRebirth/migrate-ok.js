const fs = require('fs');
let content = fs.readFileSync('backend/src/game/rules.ts', 'utf8');
const lines = content.split('\n');
let changed = 0;

function skipTemplateLiteral(line, p) {
    let depth = 0;
    p++; // skip opening backtick
    while (p < line.length) {
        if (line[p] === '\\') { p += 2; continue; }
        if (line[p] === '$' && line[p + 1] === '{') { depth++; p += 2; continue; }
        if (line[p] === '}' && depth > 0) { depth--; p++; continue; }
        if (line[p] === '`' && depth === 0) return p + 1;
        p++;
    }
    return -1;
}

function skipString(line, p, quote) {
    p++; // skip opening quote
    while (p < line.length) {
        if (line[p] === '\\') { p += 2; continue; }
        if (line[p] === quote) return p + 1;
        p++;
    }
    return -1;
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = 'return { success: true, message: ';
    const idx = line.indexOf(marker);
    if (idx === -1) continue;
    const msgStart = idx + marker.length;
    let msgEnd = -1;

    if (line[msgStart] === '`') {
        msgEnd = skipTemplateLiteral(line, msgStart);
    } else if (line[msgStart] === "'") {
        msgEnd = skipString(line, msgStart, "'");
    } else if (line[msgStart] === '"') {
        msgEnd = skipString(line, msgStart, '"');
    } else {
        // Variable like 'msg' or 'description'
        const commaIdx = line.indexOf(',', msgStart);
        const endIdx = line.indexOf(' }', msgStart);
        msgEnd = Math.min(
            commaIdx > -1 ? commaIdx : Infinity,
            endIdx > -1 ? endIdx : Infinity
        );
        if (msgEnd === Infinity) continue;
    }

    if (msgEnd === -1) continue;

    // Handle concatenation: message + `...`
    let checkPos = msgEnd;
    while (line[checkPos] === ' ') checkPos++;
    if (line[checkPos] === '+') {
        checkPos++;
        while (line[checkPos] === ' ') checkPos++;
        if (line[checkPos] === '`') {
            msgEnd = skipTemplateLiteral(line, checkPos);
        } else if (line[checkPos] === "'") {
            msgEnd = skipString(line, checkPos, "'");
        }
    }

    if (msgEnd === -1) continue;

    const msgValue = line.slice(msgStart, msgEnd);
    let afterMsg = line.slice(msgEnd).trim();
    const indent = line.match(/^(\s*)/)[1];

    if (afterMsg.startsWith(',')) {
        // Has extra properties
        let propsStr = afterMsg.slice(1).trim().replace(/\s*\};\s*$/, '');
        lines[i] = `${indent}return ok(${msgValue}, { ${propsStr} });`;
        changed++;
    } else if (afterMsg.startsWith('}')) {
        // No extra properties
        lines[i] = `${indent}return ok(${msgValue});`;
        changed++;
    }
}

content = lines.join('\n');
fs.writeFileSync('backend/src/game/rules.ts', content);
console.log(`Changed: ${changed} lines`);
