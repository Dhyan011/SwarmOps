import os
import glob

paths = glob.glob('frontend/src/components/*.jsx') + glob.glob('frontend/src/pages/*.jsx')

replacements = {
    'text-slate-100': 'text-black',
    'text-slate-200': 'text-black font-semibold',
    'text-slate-300': 'text-black',
    'text-white': 'text-black font-bold'
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

