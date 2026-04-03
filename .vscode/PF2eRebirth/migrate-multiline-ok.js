const fs = require('fs');
let content = fs.readFileSync('backend/src/game/rules.ts', 'utf8');

const lines = content.split('\n');
let changed = 0;
let skippedComplex = 0;
let i = 0;

while (i < lines.length) {
    const line = lines[i].trim();
    
    // Match both "return {" and single-line returns with shorthand message
    // Handle single-line: return { success: true, message };
    // Handle single-line: return { success: true, message, prop1: val1 };
    const singleLineMatch = line.match(/^return \{ success: true, (.+) \};$/);
    if (singleLineMatch) {
        const propsStr = singleLineMatch[1];
        // Parse properties
        // This is "message" or "message, result, targetHealth: target.currentHealth"
        // etc.
        // Split by comma, first should be message
        const messageMatch = propsStr.match(/^message(?:\s*,\s*(.+))?$/);
        if (messageMatch) {
            const indent = lines[i].match(/^(\s*)/)[1];
            if (messageMatch[1]) {
                // Has extra props
                lines[i] = `${indent}return ok(message, { ${messageMatch[1]} });`;
            } else {
                lines[i] = `${indent}return ok(message);`;
            }
            changed++;
            i++;
            continue;
        }
        // Also handle: return { success: true, message, entries };
        // return { success: true, message, detected: true, ... };
    }
    
    // Multi-line: "return {"
    if (line === 'return {' || line === 'return {  ') {
        let blockLines = [lines[i]];
        let j = i + 1;
        let found = false;
        let hasSuccessTrue = false;
        let messageValue = null;
        let extraProps = [];
        let inMessage = false;
        let messageLines = [];
        let asAny = false;
        
        while (j < lines.length && j < i + 30) {
            const trimmed = lines[j].trim();
            blockLines.push(lines[j]);
            
            if (trimmed === '};' || trimmed === '} as any;') {
                if (trimmed === '} as any;') asAny = true;
                found = true;
                break;
            }
            
            if (trimmed === 'success: true,') {
                hasSuccessTrue = true;
            } else if (trimmed.startsWith('message:') && !inMessage) {
                inMessage = true;
                let afterMessage = trimmed.slice('message:'.length).trim();
                messageLines.push(afterMessage);
                
                // Check if message ends on this line
                // It ends if it has a comma at the end (not inside template literal)
                // or if it's the last prop before };
                if (endsWithCommaOutsideString(afterMessage)) {
                    inMessage = false;
                    messageValue = afterMessage.replace(/,\s*$/, '');
                }
            } else if (inMessage) {
                messageLines.push(trimmed);
                if (endsWithCommaOutsideString(trimmed)) {
                    inMessage = false;
                    messageValue = messageLines.join('\n          ').replace(/,\s*$/, '');
                }
            } else if (trimmed.startsWith('success:') || trimmed === '') {
                // Skip
            } else if (trimmed.startsWith('//')) {
                // Skip comments
            } else if (trimmed !== '') {
                // Extra property line
                extraProps.push(trimmed.replace(/,\s*$/, ''));
            }
            
            j++;
        }
        
        if (!found || !hasSuccessTrue) {
            i++;
            continue;
        }
        
        // If message wasn't captured yet (no trailing comma - last or only non-success prop)
        if (!messageValue && messageLines.length > 0) {
            messageValue = messageLines.join('\n          ').replace(/,\s*$/, '');
        }
        
        if (!messageValue) {
            i++;
            continue;
        }
        
        const indent = lines[i].match(/^(\s*)/)[1];
        let replacement;
        
        if (extraProps.length > 0) {
            const propsJoined = extraProps.join(', ');
            if (messageValue.includes('\n')) {
                // Multi-line message with extra props
                replacement = `${indent}return ok(${messageValue}, { ${propsJoined} })${asAny ? ' as any' : ''};`;
            } else {
                replacement = `${indent}return ok(${messageValue}, { ${propsJoined} })${asAny ? ' as any' : ''};`;
            }
        } else {
            if (messageValue.includes('\n')) {
                replacement = `${indent}return ok(${messageValue})${asAny ? ' as any' : ''};`;
            } else {
                replacement = `${indent}return ok(${messageValue})${asAny ? ' as any' : ''};`;
            }
        }
        
        lines.splice(i, j - i + 1, replacement);
        changed++;
        i++;
        continue;
    }
    
    i++;
}

function endsWithCommaOutsideString(s) {
    // Check if the line ends with a comma that's not inside a string/template literal
    s = s.trim();
    if (!s.endsWith(',')) return false;
    
    // Simple check: count unescaped quotes/backticks
    let inSingle = false, inDouble = false, inTemplate = false;
    let depth = 0;
    for (let k = 0; k < s.length - 1; k++) {
        if (s[k] === '\\') { k++; continue; }
        if (s[k] === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
        if (s[k] === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
        if (s[k] === '`' && !inSingle && !inDouble) {
            if (inTemplate && depth === 0) inTemplate = false;
            else if (!inTemplate) inTemplate = true;
        }
        if (inTemplate && s[k] === '$' && s[k+1] === '{') depth++;
        if (inTemplate && s[k] === '}' && depth > 0) depth--;
    }
    
    // If we're still inside a string at the end, the comma is part of the string
    return !inSingle && !inDouble && !inTemplate;
}

content = lines.join('\n');
fs.writeFileSync('backend/src/game/rules.ts', content);
console.log(`Changed: ${changed} blocks to ok()`);
