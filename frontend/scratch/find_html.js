const fs = require('fs');
const path = require('path');

const srcDir = 'd:\\allocento\\frontend\\src\\app';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);
const pattern = />([^<{}]+)</g;

let count = 0;
files.forEach(filepath => {
    const content = fs.readFileSync(filepath, 'utf8');
    let match;
    while ((match = pattern.exec(content)) !== null) {
        let text = match[1].trim();
        // Ignore simple punctuation or very short strings
        if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes('translate')) {
            // Check if it's an angular interpolation but maybe not translating
            // Actually, if it has no {}, it's hardcoded text
            console.log(`${path.basename(filepath)}: "${text}"`);
            count++;
        }
    }
});
console.log(`Found ${count} suspicious hardcoded strings.`);
