import os

def merge_code_from_dirs(base_dirs, output_file=None, extensions=None):
    """
    Merge all code/text files under given base_dirs into one file or string.
    
    :param base_dirs: List of directory paths to search.
    :param output_file: If set, writes the result to this file. Otherwise returns the merged string.
    :param extensions: A set of file extensions to include (e.g., {'.py', '.js'}). If None, include all files.
    :return: Merged string if output_file is None.
    """
    merged_lines = []

    for base_dir in base_dirs:
        for root, _, files in os.walk(base_dir):
            for file in files:
                if extensions is None or os.path.splitext(file)[1] in extensions:
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        merged_lines.append(f"// FILE: {full_path}\n{content}\n")
                    except Exception as e:
                        print(f"Could not read {full_path}: {e}")

    result = '\n'.join(merged_lines)
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result)
    else:
        return result


# Example usage
if __name__ == "__main__":
    folders = [
        r"frontend\src",
        r"frontend\public",
        r"backend"
    ]

    merge_code_from_dirs(folders, output_file="full_code.txt", extensions={'.py','.js','.css'})  # Use None for all files
