const fs = require('fs');

const jsonEn = 'd:\\allocento\\frontend\\src\\assets\\i18n\\en.json';
const jsonHr = 'd:\\allocento\\frontend\\src\\assets\\i18n\\hr.json';

const newEnKeys = {
    "common": {
        "offline": "offline"
    }
};

const newHrKeys = {
    "common": {
        "offline": "offline"
    }
};

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

function updateJson(filepath, newKeys) {
    let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    data = deepMerge(data, newKeys);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

updateJson(jsonEn, newEnKeys);
updateJson(jsonHr, newHrKeys);
console.log("JSON updated successfully.");
