import os
import glob
import re

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Colors
    content = content.replace('text-white', 'text-slate-900')
    content = content.replace('text-slate-200', 'text-slate-900')
    content = content.replace('text-slate-300', 'text-slate-800 font-medium')
    content = content.replace('text-slate-400', 'text-slate-700')
    content = content.replace('text-slate-500', 'text-slate-600 font-medium')
    content = content.replace('text-slate-600', 'text-slate-600 font-semibold')
    
    # Backgrounds & Borders
    content = content.replace('bg-slate-900/40', 'bg-white/50 shadow-md')
    content = content.replace('bg-white/[0.03]', 'bg-white/40 shadow-sm')
    content = content.replace('bg-white/[0.04]', 'bg-white/40 shadow-sm')
    content = content.replace('bg-white/[0.05]', 'bg-white/50 shadow-md')
    content = content.replace('bg-white/[0.06]', 'bg-white/60 shadow-md')
    
    content = content.replace('border-white/[0.06]', 'border-black/[0.1]')
    content = content.replace('border-white/[0.08]', 'border-black/[0.1]')
    content = content.replace('border-white/[0.1]', 'border-black/[0.1]')
    content = content.replace('border-white/[0.12]', 'border-black/[0.15]')
    
    # Sizes
    content = re.sub(r'\btext-xs\b', 'text-sm', content)
    content = re.sub(r'\btext-sm\b', 'text-base', content)
    content = re.sub(r'\btext-base\b', 'text-lg', content)
    content = re.sub(r'\btext-lg\b', 'text-xl', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

# Find all jsx files
jsx_files = glob.glob('src/**/*.jsx', recursive=True)
for f in jsx_files:
    if "LandingPage" not in f: # Skip LandingPage as we already manually updated it
        replace_in_file(f)

