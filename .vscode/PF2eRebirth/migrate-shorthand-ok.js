const fs = require('fs');
let content = fs.readFileSync('backend/src/game/rules.ts', 'utf8');

const lines = content.split('\n');
let changed = 0;
let i = 0;

while (i < lines.length) {
    const line = lines[i].trim();
    
    // Multi-line: "return {"
    if (line === 'return {') {
        let j = i + 1;
        let found = false;
        let hasSuccessTrue = false;
        let hasShorthandMessage = false;
        let extraPropLines = [];
        let closingLine = -1;
        let asAny = false;
        
        while (j < lines.length && j < i + 30) {
            const trimmed = lines[j].trim();
            
            if (trimmed === '};' || trimmed === '} as any;') {
                if (trimmed === '} as any;') asAny = true;
                found = true;
                closingLine = j;
                break;
            }
            
            if (trimmed === 'success: true,') {
                hasSuccessTrue = true;
            } else if (trimmed === 'message,' || trimmed === 'message') {
                hasShorthandMessage = true;
            } else if (trimmed.startsWith('message:')) {
                // Already handled by previous script - skip this block
                break;
            } else if (trimmed !== '' && !trimmed.startsWith('//')) {
                // Extra property line - collect it
                extraPropLines.push(trimmed.replace(/,\s*$/, ''));
            }
            
            j++;
        }
        
        if (!found || !hasSuccessTrue || !hasShorthandMessage) {
            i++;
            continue;
        }
        
        const indent = lines[i].match(/^(\s*)/)[1];
        let replacement;
        
        if (extraPropLines.length > 0) {
            const propsJoined = extraPropLines.join(', ');
            replacement = `${indent}return ok(message, { ${propsJoined} })${asAny ? ' as any' : ''};`;
        } else {
            replacement = `${indent}return ok(message)${asAny ? ' as any' : ''};`;
        }
        
        lines.splice(i, closingLine - i + 1, replacement);
        changed++;
        i++;
        continue;
    }
    
    i++;
}

content = lines.join('\n');
fs.writeFileSync('backend/src/game/rules.ts', content);
console.log(`Changed: ${changed} shorthand-message blocks to ok()`);
