const fs = require('fs');

const jsonEn = 'd:\\allocento\\frontend\\src\\assets\\i18n\\en.json';
const jsonHr = 'd:\\allocento\\frontend\\src\\assets\\i18n\\hr.json';

const newEnKeys = {
    "reports": {
        "filters": "Filters",
        "category": "Category",
        "all": "All",
        "project": "Project",
        "income": "Income",
        "expense": "Expense",
        "totalBalance": "Total Balance",
        "noTransactions": "No transactions for selected filters"
    },
    "common": {
        "from": "From",
        "to": "To",
        "transactions": "Transactions",
        "trend": "Income and Expense Trend",
        "categoriesSplit": "Expense Split"
    },
    "transactions": {
        "other": "Other",
        "deleteSuccess": "Transaction deleted successfully!",
        "deleteFailed": "Failed to delete transaction."
    },
    "nav": {
        "reports": "Reports",
        "categories": "Categories",
        "projects": "Projects"
    }
};

const newHrKeys = {
    "reports": {
        "filters": "Filteri",
        "category": "Kategorija",
        "all": "Sve",
        "project": "Projekt",
        "income": "Prihodi",
        "expense": "Rashodi",
        "totalBalance": "Ukupan Saldo",
        "noTransactions": "Nema transakcija za odabrane filtere"
    },
    "common": {
        "from": "Od",
        "to": "Do",
        "transactions": "Transakcije",
        "trend": "Trend Prihoda i Rashoda",
        "categoriesSplit": "Raspodjela Rashoda"
    },
    "transactions": {
        "other": "Ostalo",
        "deleteSuccess": "Transakcija uspješno obrisana!",
        "deleteFailed": "Greška pri brisanju transakcije."
    },
    "nav": {
        "reports": "Izvještaji",
        "categories": "Kategorije",
        "projects": "Projekti"
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
