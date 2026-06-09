import os
import glob
import re

# Update index.css for Light Mode Glass
with open("frontend/src/index.css", "r") as f:
    css = f.read()

# Replace dark glass with light glass
css = css.replace('background: rgba(12, 18, 32, 0.6);', 'background: rgba(255, 255, 255, 0.85);')
css = css.replace('border: 1px solid rgba(255, 255, 255, 0.08);', 'border: 1px solid rgba(0, 0, 0, 0.1);')
css = css.replace('box-shadow: \n    0 4px 24px -4px rgba(0, 0, 0, 0.5)', 'box-shadow: \n    0 4px 24px -4px rgba(0, 0, 0, 0.1)')
css = css.replace('color: var(--text-primary);', 'color: #0f172a;') # dark text

with open("frontend/src/index.css", "w") as f:
    f.write(css)

# Update components to text-black
paths = glob.glob('frontend/src/components/*.jsx') + glob.glob('frontend/src/pages/*.jsx')

for filepath in paths:
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    content = content.replace('text-white', 'text-black')
    content = content.replace('text-slate-300', 'text-slate-700')
    content = content.replace('text-slate-400', 'text-slate-600')
    content = content.replace('placeholder-slate-400', 'placeholder-slate-500')
    
    # Increase font sizes slightly since black on white can sometimes need it
    # We already increased them to text-base and text-lg
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)

