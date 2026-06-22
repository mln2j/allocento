import os
import re
import json

src_dir = r"d:\allocento\frontend\src\app"
json_en = r"d:\allocento\frontend\src\assets\i18n\en.json"
json_hr = r"d:\allocento\frontend\src\assets\i18n\hr.json"

def process_ts_files():
    pattern_fallback = re.compile(r"(this\.toastService\.(?:success|error|warning|info))\s*\(\s*(?:translatedApiMsg\s*\|\|\s*)?this\.t\('([^']+)'\)\s*\|\|\s*'([^']+)'\s*\)")
    pattern_hardcoded = re.compile(r"(this\.toastService\.(?:success|error|warning|info))\s*\(\s*'([^']+)'\s*\)")
    
    extracted = {}

    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(".ts"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content
                
                # Replace pattern 1: this.toastService.success(this.t('key') || 'Fallback')
                for match in pattern_fallback.finditer(content):
                    full_match = match.group(0)
                    method = match.group(1)
                    key = match.group(2)
                    fallback = match.group(3)
                    
                    extracted[key] = fallback
                    
                    if "translatedApiMsg" in full_match:
                        replacement = f"{method}(translatedApiMsg || this.t('{key}'))"
                    else:
                        replacement = f"{method}(this.t('{key}'))"
                    
                    new_content = new_content.replace(full_match, replacement)
                
                # Replace pattern 2: this.toastService.success('Hardcoded')
                for match in pattern_hardcoded.finditer(content):
                    full_match = match.group(0)
                    method = match.group(1)
                    hardcoded = match.group(2)
                    
                    # Generate a key based on the file name and a slug
                    base_name = os.path.basename(filepath).replace('.page.ts', '').replace('.component.ts', '')
                    slug = re.sub(r'[^a-zA-Z0-9]', '', hardcoded.title())[:15]
                    slug = slug[0].lower() + slug[1:]
                    key = f"{base_name}.{slug}"
                    
                    extracted[key] = hardcoded
                    
                    replacement = f"{method}(this.t('{key}'))"
                    new_content = new_content.replace(full_match, replacement)
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                        
    return extracted

def fix_encoding(text):
    return text.replace('Ä\x8d', 'č').replace('Ä\x87', 'ć').replace('Å¡', 'š').replace('Å¾', 'ž').replace('Ä\x91', 'đ').replace('Ä\x8c', 'Č').replace('Ä\x86', 'Ć').replace('Å\xa0', 'Š').replace('Å½', 'Ž').replace('Ä\x90', 'Đ')

def update_json(filepath, extracted, is_hr=False):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for key_path, value in extracted.items():
        parts = key_path.split('.')
        current = data
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                # Always add if missing, or if it has bad characters
                if part not in current or "Ä" in current[part] or "Å" in current[part]:
                    if is_hr:
                        current[part] = fix_encoding(value)
                    else:
                        current[part] = value
            else:
                if part not in current:
                    current[part] = {}
                current = current[part]
                
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    extracted = process_ts_files()
    print("Extracted strings:", len(extracted))
    for k, v in extracted.items():
        print(f"  {k}: {v}")
        
    update_json(json_en, extracted, is_hr=False)
    update_json(json_hr, extracted, is_hr=True)
    print("Updated JSON files.")
