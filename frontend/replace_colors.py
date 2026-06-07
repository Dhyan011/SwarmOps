import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # We want to replace cyan -> blue, violet -> amber
    new_content = content.replace('cyan', 'blue').replace('violet', 'amber')
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

search_path = 'src/**/*.jsx'
for filepath in glob.glob(search_path, recursive=True):
    replace_in_file(filepath)

search_path_css = 'src/**/*.css'
for filepath in glob.glob(search_path_css, recursive=True):
    replace_in_file(filepath)

print("Done replacing colors.")
