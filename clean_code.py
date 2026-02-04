
import os
import re

def remove_comments_and_empty_lines(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove single line comments (//) but ignore URLs (http:// or https://)
    # Using a negative lookbehind to ensure // is not preceded by : (as in http:)
    # And ensuring it's not inside a string (simplistic approach, might be fragile for complex code)
    # A safer regex for // comments that respects URLs:
    # Match // only if not preceded by :
    content = re.sub(r'(?<!:)\/\/.*', '', content)

    # Remove multi-line comments (/* ... */)
    content = re.sub(r'\/\*[\s\S]*?\*\/', '', content)

    lines = content.splitlines()
    cleaned_lines = [line for line in lines if line.strip()]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(cleaned_lines) + '\n')

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.git' in root or '.next' in root or 'dist' in root or 'build' in root:
            continue
            
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css', '.scss')):
                file_path = os.path.join(root, file)
                print(f"Processing: {file_path}")
                try:
                    remove_comments_and_empty_lines(file_path)
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    # Process backend and shop if they exist relative to script, or just current
    # Assuming script is run from root or we target specific folders
    # Let's target the current directory's src if it exists, otherwise current dir recursively
    
    target_dir = current_dir
    print(f"Cleaning code in: {target_dir}")
    process_directory(target_dir)
    print("Done.")
