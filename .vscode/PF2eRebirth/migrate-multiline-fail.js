const fs = require('fs');
let content = fs.readFileSync('backend/src/game/rules.ts', 'utf8');

// Handle multi-line return { success: false, message: ..., errorCode?: ... };
// Pattern 1: return {\n  success: false,\n  message: MSG\n};
// Pattern 2: return {\n  success: false,\n  message: MSG,\n  errorCode: CODE\n};
// Skip: returns with extra properties beyond message and errorCode

// Match multi-line blocks: return {\n...success: false...message:...\n...};
// We'll iterate through lines and find these blocks

const lines = content.split('\n');
let changed = 0;
let skipped = 0;
let i = 0;

while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for opening: "return {"
    if (line === 'return {' || line === 'return { ') {
        // Scan forward to find the closing };
        let blockLines = [lines[i]];
        let j = i + 1;
        let found = false;
        let hasSuccessFalse = false;
        let messageValue = null;
        let errorCodeValue = null;
        let hasExtraProps = false;
        let messageStartLine = -1;
        let messageLines = [];
        let inMessage = false;
        
        while (j < lines.length && j < i + 15) { // max 15 lines for a return block
            const trimmed = lines[j].trim();
            blockLines.push(lines[j]);
            
            if (trimmed === '};' || trimmed === '} as any;') {
                found = true;
                break;
            }
            
            if (trimmed === 'success: false,') {
                hasSuccessFalse = true;
            } else if (trimmed.startsWith('message:')) {
                inMessage = true;
                messageStartLine = j;
                // Check if message ends on same line
                const afterMessage = trimmed.slice('message:'.length).trim();
                messageLines.push(afterMessage);
                // Check if the message line ends with a comma (single-line message)
                if (afterMessage.endsWith(',') || afterMessage.endsWith("',") || afterMessage.endsWith('`,')) {
                    inMessage = false;
                    messageValue = afterMessage.replace(/,\s*$/, '');
                } else if (!afterMessage.endsWith(',')) {
                    // Could be end of message without trailing comma (last prop)
                    // Or could be multi-line message
                    // Check next line
                }
            } else if (inMessage) {
                messageLines.push(trimmed);
                if (trimmed.endsWith(',') || trimmed === '') {
                    inMessage = false;
                    messageValue = messageLines.join('\n').replace(/,\s*$/, '').trim();
                }
            } else if (trimmed.startsWith('errorCode:')) {
                const ecMatch = trimmed.match(/errorCode:\s*'([^']+)'/);
                if (ecMatch) {
                    errorCodeValue = ecMatch[1];
                }
            } else if (trimmed.startsWith('success:') || trimmed === '') {
                // Skip
            } else if (trimmed.startsWith('//')) {
                // Skip comments
            } else if (trimmed !== '' && !trimmed.startsWith('success:')) {
                // Extra property
                hasExtraProps = true;
            }
            
            j++;
        }
        
        if (!found || !hasSuccessFalse) {
            i++;
            continue;
        }
        
        // If message wasn't captured yet (last prop without trailing comma)
        if (!messageValue && messageLines.length > 0) {
            messageValue = messageLines.join('\n').replace(/,\s*$/, '').trim();
        }
        
        if (!messageValue) {
            i++;
            continue;
        }
        
        if (hasExtraProps) {
            skipped++;
            i = j + 1;
            continue;
        }
        
        // Build the replacement
        const indent = lines[i].match(/^(\s*)/)[1];
        let replacement;
        if (errorCodeValue) {
            // Multi-line message?
            if (messageValue.includes('\n')) {
                replacement = `${indent}return fail(${messageValue}, '${errorCodeValue}');`;
            } else {
                replacement = `${indent}return fail(${messageValue}, '${errorCodeValue}');`;
            }
        } else {
            if (messageValue.includes('\n')) {
                replacement = `${indent}return fail(${messageValue});`;
            } else {
                replacement = `${indent}return fail(${messageValue});`;
            }
        }
        
        // Replace the block
        lines.splice(i, j - i + 1, replacement);
        changed++;
        i++;
        continue;
    }
    
    i++;
}

content = lines.join('\n');
fs.writeFileSync('backend/src/game/rules.ts', content);
console.log(`Changed: ${changed} multi-line blocks to fail()`);
console.log(`Skipped: ${skipped} blocks with extra properties`);
