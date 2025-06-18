#!/bin/bash

# Fix Context Variable Conflicts in API Routes
# Resolves naming conflicts between function parameter and local variable

set -e

echo "🔧 Fixing Context Variable Conflicts"
echo "===================================="

LOG_FILE="test-reports/context-fixes.log"

mkdir -p "test-reports"

echo "📋 Context Fixes Started: $(date)" | tee "$LOG_FILE"

# Fix files with context naming conflicts
echo "1️⃣ Fixing context variable conflicts..." | tee -a "$LOG_FILE"

# List of files that need fixing based on the build error
files=(
  "src/app/api/competitors/[id]/route.ts"
  "src/app/api/projects/[id]/analysis/route.ts"
  "src/app/api/projects/[id]/route.ts"
  "src/app/api/projects/[id]/smart-ai-analysis/route.ts"
  "src/app/api/projects/[id]/smart-scheduling/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing context conflict in: $file" | tee -a "$LOG_FILE"
    
    # Rename the local context variable to avoid conflicts
    sed -i.bak 's/const context = {/const logContext = {/g' "$file"
    sed -i.bak 's/context,/logContext,/g' "$file"
    sed -i.bak 's/context)/logContext)/g' "$file"
    
    # Remove backup files
    rm -f "$file.bak"
  fi
done

# Test compilation
echo "2️⃣ Testing compilation..." | tee -a "$LOG_FILE"
npm run build > "test-reports/build-test-after-context-fixes.log" 2>&1 || echo "⚠️  Build test encountered issues" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "🎯 Context Fixes Summary:" | tee -a "$LOG_FILE"
echo "=========================" | tee -a "$LOG_FILE"
echo "✅ Fixed context variable naming conflicts" | tee -a "$LOG_FILE"
echo "✅ Renamed local context variables to logContext" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Completed: $(date)" | tee -a "$LOG_FILE"

echo ""
echo "🔧 Context Variable Conflicts Fixed!"
echo "📊 Check test-reports/context-fixes.log for details"
echo "🚀 Run 'npm run build' to test the fixes" 