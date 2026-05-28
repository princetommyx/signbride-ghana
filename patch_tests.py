import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'importProvidersFrom(NgxsModule.forRoot' in content:
        return

    if 'provideStore(' not in content:
        return

    print(f'Patching {filepath}')

    new_content = re.sub(r'provideStore\((.*?ngxsConfig.*?)\)', r'importProvidersFrom(NgxsModule.forRoot(\1))', content, flags=re.DOTALL)
    
    if 'importProvidersFrom' not in new_content:
        new_content = re.sub(r'import\s+\{(.*?)\}\s+from\s+[\'\"]@angular/core[\'\"];', 
                             lambda m: f"import {{{m.group(1)}, importProvidersFrom}} from '@angular/core';", 
                             new_content, count=1)
        if 'importProvidersFrom' not in new_content:
            new_content = f"import {{ importProvidersFrom }} from '@angular/core';\n{new_content}"

    if 'NgxsModule' not in new_content:
        new_content = re.sub(r'import\s+\{(.*?)\}\s+from\s+[\'\"]@ngxs/store[\'\"];', 
                             lambda m: f"import {{{m.group(1)}, NgxsModule}} from '@ngxs/store';", 
                             new_content, count=1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

for root, dirs, files in os.walk('src/app'):
    for file in files:
        if file.endswith('.spec.ts'):
            process_file(os.path.join(root, file))
