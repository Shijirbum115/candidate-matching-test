import os

EXCLUDE_DIRS = {'.venv', 'node_modules', '__pycache__', '.git', 'planning', 'data_migration','.history'}
VALID_EXTENSIONS = {'.py', '.js', '.css', '.html', '.env','.json', '.txt', '.md', '.yml', '.yaml', '.toml', '.csv', '.xml'}

def print_tree(start_path, indent=''):
    for item in sorted(os.listdir(start_path)):
        full_path = os.path.join(start_path, item)
        if os.path.isdir(full_path):
            if item in EXCLUDE_DIRS:
                continue
            print(f"{indent}📁 {item}/")
            print_tree(full_path, indent + '    ')
        else:
            if os.path.splitext(item)[1] in VALID_EXTENSIONS:
                print(f"{indent}📄 {item}")

print_tree('.')
