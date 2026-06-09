import os
import glob

# 1. Update index.css to Dark Glass
with open("frontend/src/index.css", "r") as f:
    css = f.read()

css = css.replace('background: rgba(255, 255, 255, 0.85);', 'background: rgba(12, 18, 32, 0.6);')
css = css.replace('border: 1px solid rgba(0, 0, 0, 0.1);', 'border: 1px solid rgba(255, 255, 255, 0.08);')
css = css.replace('box-shadow: \n    0 4px 24px -4px rgba(0, 0, 0, 0.1)', 'box-shadow: \n    0 4px 24px -4px rgba(0, 0, 0, 0.5)')
css = css.replace('color: #0f172a;', 'color: var(--text-primary);') # white text

with open("frontend/src/index.css", "w") as f:
    f.write(css)

# 2. Update all components to text-white
paths = glob.glob('frontend/src/components/*.jsx') + glob.glob('frontend/src/pages/*.jsx')

for filepath in paths:
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    content = content.replace('text-black font-extrabold', 'text-white')
    content = content.replace('text-black font-bold', 'text-white font-bold')
    content = content.replace('text-black', 'text-white')
    content = content.replace('text-slate-700', 'text-slate-200')
    content = content.replace('text-slate-600', 'text-slate-300')
    content = content.replace('text-slate-900', 'text-white')
    
    # Recharts specific fixes for Analytics page
    content = content.replace('stroke="rgba(0,0,0,0.1)"', 'stroke="rgba(255,255,255,0.04)"')
    content = content.replace('stroke="rgba(0,0,0,0.2)"', 'stroke="rgba(255,255,255,0.06)"')
    content = content.replace('fill: "#000000", fontWeight: "bold"', 'fill: "#94a3b8"')
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)

