import os
import glob

# Paths to process
paths = glob.glob('frontend/src/components/*.jsx') + glob.glob('frontend/src/pages/*.jsx')

replacements = {
    'text-slate-500': 'text-slate-200 text-base font-medium',
    'text-slate-400': 'text-slate-100 text-lg font-semibold',
    'text-sm': 'text-base',
    'text-xs': 'text-sm'
}

for filepath in paths:
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

