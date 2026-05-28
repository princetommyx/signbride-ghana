import os
import re

def fix_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    if 'importProvidersFrom' in content and 'import { importProvidersFrom' not in content and 'import {importProvidersFrom' not in content:
        # Check if @angular/core is already imported
        if "from '@angular/core';" in content or 'from "@angular/core";' in content:
            content = re.sub(r'import\s+\{(.*?)\}\s+from\s+[\'\"]@angular/core[\'\"];', 
                             lambda m: f"import {{{m.group(1)}, importProvidersFrom}} from '@angular/core';", 
                             content, count=1)
        else:
            content = f"import {{ importProvidersFrom }} from '@angular/core';\n{content}"
        changed = True

    if 'NgxsModule' in content and 'NgxsModule' not in content[:content.find('describe(')]:
        # Check if @ngxs/store is already imported
        if "from '@ngxs/store';" in content or 'from "@ngxs/store";' in content:
            content = re.sub(r'import\s+\{(.*?)\}\s+from\s+[\'\"]@ngxs/store[\'\"];', 
                             lambda m: f"import {{{m.group(1)}, NgxsModule}} from '@ngxs/store';" if 'NgxsModule' not in m.group(1) else m.group(0), 
                             content, count=1)
        else:
            content = f"import {{ NgxsModule }} from '@ngxs/store';\n{content}"
        changed = True

    if changed:
        print(f"Fixed imports for {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, dirs, files in os.walk('src/app'):
    for file in files:
        if file.endswith('.spec.ts'):
            fix_imports(os.path.join(root, file))
