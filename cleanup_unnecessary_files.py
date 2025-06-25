#!/usr/bin/env python3
"""
Cleanup Script - Remove Unnecessary Code Files
This script identifies and helps remove redundant/unused files in your project
"""

import os
import sys
from pathlib import Path

# Files that can be safely removed (redundant/unused)
UNNECESSARY_FILES = [
    # Redundant search implementations
    "backend/search/bm25_search.py",  # Replaced by optimized ES
    "backend/search/enhanced_keyword_search.py",  # Replaced by optimized ES
    
    # Test files that are no longer needed
    "test/bm25_elastic_demo.py",
    "test/bm25vsSimpleSearch.py", 
    "test/candidate_selection_test.py",
    "test/complete_search_query.py",
    "test/structured_search.py",
    
    # Duplicate/old scripts
    "scripts/diagnose_search_issues.py",
    "scripts/fix_elasticsearch_analyzer.py",
    "scripts/full_reindex_elasticsearch.py",
    
    # Redundant CSS (if using Tailwind)
    "frontend/src/styles/SearchForm.css",  # Replaced by Tailwind classes
    "frontend/src/components/SearchForm.js",  # Replaced by optimized SearchInput
    
    # Old translation script
    "data_migration/translation.py",  # Keep translation_merged.py instead
    
    "csv_prep.py"
]

# Files to keep (important)
IMPORTANT_FILES = [
    "backend/main.py",  # Will be replaced with optimized version
    "backend/search/elasticsearch_service.py",  # Will be replaced 
    "backend/search/elasticsearch_search.py",  # Will be replaced
    "backend/search/candidate_scorer.py",  # Will be replaced
    "backend/search/query_processor.py",
    "backend/translation/translator.py",
    "backend/database/db.py",
    "data_migration/translation_merged.py",  # Keep this one
    "data_migration/migrate.py",  # Main migration script
    "data_migration/vectorizer_openai.py",  # For embeddings
]

def check_file_usage(file_path):
    """Check if a file is imported/used elsewhere"""
    file_stem = Path(file_path).stem
    project_root = Path(".")
    
    # Search for imports of this file
    for py_file in project_root.rglob("*.py"):
        if py_file.name == Path(file_path).name:
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if f"import {file_stem}" in content or f"from {file_stem}" in content:
                    return True
        except:
            pass
    
    return False

def analyze_project():
    """Analyze project for unnecessary files"""
    print("🔍 Analyzing project for unnecessary files...\n")
    
    can_remove = []
    cannot_remove = []
    
    for file_path in UNNECESSARY_FILES:
        if os.path.exists(file_path):
            is_used = check_file_usage(file_path)
            file_size = os.path.getsize(file_path) / 1024  # KB
            
            if is_used:
                cannot_remove.append((file_path, f"Still imported somewhere ({file_size:.1f} KB)"))
            else:
                can_remove.append((file_path, f"Not used ({file_size:.1f} KB)"))
        else:
            print(f"📁 {file_path} - Already removed")
    
    print("✅ Files that can be safely removed:")
    total_size = 0
    for file_path, reason in can_remove:
        print(f"   🗑️  {file_path} - {reason}")
        total_size += os.path.getsize(file_path) / 1024
    
    print(f"\n💾 Total space that can be freed: {total_size:.1f} KB\n")
    
    if cannot_remove:
        print("⚠️  Files that are still in use (don't remove):")
        for file_path, reason in cannot_remove:
            print(f"   📌 {file_path} - {reason}")
        print()
    
    return can_remove

def remove_files(files_to_remove):
    """Remove the unnecessary files"""
    print("🗑️  Removing unnecessary files...\n")
    
    for file_path, _ in files_to_remove:
        try:
            os.remove(file_path)
            print(f"✅ Removed: {file_path}")
        except Exception as e:
            print(f"❌ Failed to remove {file_path}: {e}")

def main():
    print("🧹 PROJECT CLEANUP TOOL")
    print("=" * 50)
    
    # Analyze first
    files_to_remove = analyze_project()
    
    if not files_to_remove:
        print("🎉 No unnecessary files found! Project is already clean.")
        return
    
    # Ask for confirmation
    print(f"Do you want to remove {len(files_to_remove)} unnecessary files? (y/N): ", end="")
    response = input().strip().lower()
    
    if response in ['y', 'yes']:
        remove_files(files_to_remove)
        print(f"\n🎉 Cleanup complete! Removed {len(files_to_remove)} files.")
        
        # Recommendations
        print("\n📋 NEXT STEPS:")
        print("1. Replace backend/main.py with the optimized version")
        print("2. Replace backend/search/elasticsearch_service.py with optimized version")
        print("3. Replace backend/search/elasticsearch_search.py with OptimizedHybridSearch")
        print("4. Replace backend/search/candidate_scorer.py with OptimizedCandidateScorer")
        print("5. Test the new tier-based search system")
        print("6. Run: python scripts/reindex_elasticsearch.py")
        
    else:
        print("🚫 Cleanup cancelled. No files were removed.")

if __name__ == "__main__":
    main()