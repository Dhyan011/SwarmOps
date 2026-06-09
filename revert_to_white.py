import os
import glob
import re

paths = glob.glob('frontend/src/components/*.jsx') + glob.glob('frontend/src/pages/*.jsx')

for filepath in paths:
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # We have duplicates like 'text-sm text-black text-lg'
    # Let's just fix it by replacing text-black with text-white
    content = content.replace('text-black', 'text-white')
    
    # Increase base font sizes
    content = content.replace('text-sm', 'text-base')
    content = content.replace('text-xs', 'text-sm')
    
    # Make specific placeholder texts lighter so they are visible
    content = content.replace('placeholder-slate-600', 'placeholder-slate-400')
    content = content.replace('text-slate-600', 'text-slate-300')
        
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

