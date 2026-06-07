import os
import glob
import re

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # We invert what replace_text_styles.py did.
    # We must be careful because 'text-slate-900' might have been 'text-white' OR 'text-slate-200'.
    # We'll map text-slate-900 -> text-white
    # text-slate-800 font-medium -> text-slate-300
    # text-slate-700 -> text-slate-400
    # text-slate-600 font-medium -> text-slate-500
    # text-slate-600 font-semibold -> text-slate-600
    
    content = content.replace('text-slate-900', 'text-white')
    content = content.replace('text-slate-800 font-medium', 'text-slate-300')
    content = content.replace('text-slate-700', 'text-slate-400')
    content = content.replace('text-slate-600 font-medium', 'text-slate-500')
    content = content.replace('text-slate-600 font-semibold', 'text-slate-600')
    
    content = content.replace('bg-white/50 shadow-md', 'bg-slate-900/40')
    content = content.replace('bg-white/40 shadow-sm', 'bg-white/[0.03]')
    content = content.replace('bg-white/60 shadow-md', 'bg-slate-900/40')
    
    content = content.replace('border-black/[0.1]', 'border-white/[0.08]')
    content = content.replace('border-black/[0.15]', 'border-white/[0.12]')
    
    # Sizes inversion
    content = re.sub(r'\btext-xl\b', 'text-lg', content)
    content = re.sub(r'\btext-lg\b', 'text-base', content)
    content = re.sub(r'\btext-base\b', 'text-sm', content)
    content = re.sub(r'\btext-sm\b', 'text-xs', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Reverted {filepath}")

files = glob.glob('src/components/*.jsx') + glob.glob('src/pages/DashboardPage.jsx')
for f in files:
    if "Layout.jsx" in f:
        continue # We want to keep Layout text-slate-900 or whatever, wait layout doesn't matter much.
    replace_in_file(f)

