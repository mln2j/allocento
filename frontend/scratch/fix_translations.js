const fs = require('fs');
const path = require('path');

const srcDir = 'd:\\allocento\\frontend\\src\\app';
const jsonEn = 'd:\\allocento\\frontend\\src\\assets\\i18n\\en.json';
const jsonHr = 'd:\\allocento\\frontend\\src\\assets\\i18n\\hr.json';

function processTsFiles() {
    const patternFallback = /(this\.toastService\.(success|error|warning|info))\s*\(\s*(translatedApiMsg\s*\|\|\s*)?this\.t\('([^']+)'\)\s*\|\|\s*'([^']+)'\s*\)/g;
    const patternHardcoded = /(this\.toastService\.(success|error|warning|info))\s*\(\s*'([^']+)'\s*\)/g;
    
    const extracted = {};

    function walk(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(walk(file));
            } else if (file.endsWith('.ts')) {
                results.push(file);
            }
        });
        return results;
    }

    const files = walk(srcDir);
    
    files.forEach(filepath => {
        let content = fs.readFileSync(filepath, 'utf8');
        let newContent = content;
        
        // Replace pattern 1
        let match;
        while ((match = patternFallback.exec(content)) !== null) {
            const fullMatch = match[0];
            const method = match[1];
            const hasTranslatedApiMsg = match[3];
            const key = match[4];
            const fallback = match[5];
            
            extracted[key] = fallback;
            
            const replacement = hasTranslatedApiMsg 
                ? `${method}(translatedApiMsg || this.t('${key}'))`
                : `${method}(this.t('${key}'))`;
                
            newContent = newContent.replace(fullMatch, replacement);
        }
        
        // Replace pattern 2
        patternHardcoded.lastIndex = 0; // reset
        while ((match = patternHardcoded.exec(content)) !== null) {
            const fullMatch = match[0];
            const method = match[1];
            const hardcoded = match[3];
            
            let baseName = path.basename(filepath).replace('.page.ts', '').replace('.component.ts', '');
            let slug = hardcoded.replace(/[^a-zA-Z0-9]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('').substring(0, 15);
            slug = slug.charAt(0).toLowerCase() + slug.slice(1);
            if (!slug) slug = 'message';
            const key = `${baseName}.${slug}`;
            
            extracted[key] = hardcoded;
            
            const replacement = `${method}(this.t('${key}'))`;
            newContent = newContent.replace(fullMatch, replacement);
        }
        
        if (newContent !== content) {
            fs.writeFileSync(filepath, newContent, 'utf8');
        }
    });
                        
    return extracted;
}

function fixEncoding(text) {
    return text.replace(/Ä\x8d/g, 'č')
               .replace(/Ä\x87/g, 'ć')
               .replace(/Å¡/g, 'š')
               .replace(/Å¾/g, 'ž')
               .replace(/Ä\x91/g, 'đ')
               .replace(/Ä\x8c/g, 'Č')
               .replace(/Ä\x86/g, 'Ć')
               .replace(/Å\xA0/g, 'Š')
               .replace(/Å½/g, 'Ž')
               .replace(/Ä\x90/g, 'Đ');
}

function updateJson(filepath, extracted, isHr) {
    let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
    for (const [keyPath, value] of Object.entries(extracted)) {
        const parts = keyPath.split('.');
        let current = data;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                if (!current[part] || current[part] === "" || current[part].includes("Ä") || current[part].includes("Å")) {
                    current[part] = isHr ? fixEncoding(value) : value;
                }
            } else {
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }
        }
    }
                
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

const extracted = processTsFiles();
console.log("Extracted strings:", Object.keys(extracted).length);
for (const [k, v] of Object.entries(extracted)) {
    console.log(`  ${k}: ${v}`);
}

updateJson(jsonEn, extracted, false);
updateJson(jsonHr, extracted, true);
console.log("Updated JSON files.");
