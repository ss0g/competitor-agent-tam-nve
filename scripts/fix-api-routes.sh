#!/bin/bash

# Fix API Routes - Next.js 15 Compatibility
# Updates all API routes to use the new parameter format

set -e

echo "🔧 Fixing API Routes for Next.js 15"
echo "=================================="

LOG_FILE="test-reports/api-routes-fixes.log"
BACKUP_DIR="backups/api-routes-$(date +%Y%m%d_%H%M%S)"

mkdir -p "test-reports"
mkdir -p "$BACKUP_DIR"

echo "📋 API Routes Fixes Started: $(date)" | tee "$LOG_FILE"

# Step 1: Backup API routes
echo "1️⃣ Backing up API routes..." | tee -a "$LOG_FILE"
cp -r "src/app/api" "$BACKUP_DIR/"

# Step 2: Fix all API routes with [id] parameters
echo "2️⃣ Fixing API routes with [id] parameters..." | tee -a "$LOG_FILE"

# Find all files with the old parameter pattern and fix them
find src/app/api -name "*.ts" -type f | while read -r file; do
  if grep -q "{ params }: { params: { id: string" "$file"; then
    echo "Fixing: $file" | tee -a "$LOG_FILE"
    
    # Fix the parameter destructuring pattern
    sed -i.bak 's/{ params }: { params: { id: string } }/context: { params: Promise<{ id: string }> }/g' "$file"
    
    # Fix the parameter usage
    sed -i.bak 's/const { id } = params;/const { id } = await context.params;/g' "$file"
    
    # Also handle cases where params is used directly
    sed -i.bak 's/params\.id/\(await context.params\).id/g' "$file"
    
    # Remove backup files
    rm -f "$file.bak"
  fi
done

# Step 3: Fix special cases with projectId parameter
echo "3️⃣ Fixing routes with projectId parameters..." | tee -a "$LOG_FILE"

find src/app/api -name "*.ts" -type f | while read -r file; do
  if grep -q "{ params }: { params: { projectId: string" "$file"; then
    echo "Fixing projectId in: $file" | tee -a "$LOG_FILE"
    
    # Fix projectId parameter patterns
    sed -i.bak 's/{ params }: { params: { projectId: string } }/context: { params: Promise<{ projectId: string }> }/g' "$file"
    sed -i.bak 's/const { projectId } = params;/const { projectId } = await context.params;/g' "$file"
    sed -i.bak 's/params\.projectId/\(await context.params\).projectId/g' "$file"
    
    # Remove backup files
    rm -f "$file.bak"
  fi
done

# Step 4: Update import statements to include NextRequest
echo "4️⃣ Updating import statements..." | tee -a "$LOG_FILE"

find src/app/api -name "*.ts" -type f | while read -r file; do
  if grep -q "import.*NextResponse.*from 'next/server'" "$file" && ! grep -q "NextRequest" "$file"; then
    echo "Updating imports in: $file" | tee -a "$LOG_FILE"
    
    # Add NextRequest to imports
    sed -i.bak 's/import { NextResponse } from '\''next\/server'\''/import { NextRequest, NextResponse } from '\''next\/server'\''/g' "$file"
    
    # Update function parameter types from Request to NextRequest
    sed -i.bak 's/request: Request,/request: NextRequest,/g' "$file"
    
    # Remove backup files
    rm -f "$file.bak"
  fi
done

# Step 5: Test compilation
echo "5️⃣ Testing compilation..." | tee -a "$LOG_FILE"
npm run build > "test-reports/build-test-after-api-fixes.log" 2>&1 || echo "⚠️  Build test encountered issues" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "🎯 API Routes Fixes Summary:" | tee -a "$LOG_FILE"
echo "============================" | tee -a "$LOG_FILE"
echo "✅ Updated parameter destructuring pattern" | tee -a "$LOG_FILE"
echo "✅ Fixed parameter usage with await" | tee -a "$LOG_FILE"
echo "✅ Updated import statements" | tee -a "$LOG_FILE"
echo "✅ Fixed projectId parameter routes" | tee -a "$LOG_FILE"
echo "📁 Backups saved to: $BACKUP_DIR" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "🔄 Next Steps:" | tee -a "$LOG_FILE"
echo "1. Run 'npm run build' to test compilation" | tee -a "$LOG_FILE"
echo "2. Check build log: test-reports/build-test-after-api-fixes.log" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Completed: $(date)" | tee -a "$LOG_FILE"

echo ""
echo "🔧 API Routes Fixed for Next.js 15!"
echo "📊 Check test-reports/api-routes-fixes.log for details"
echo "🚀 Run 'npm run build' to test the fixes" 