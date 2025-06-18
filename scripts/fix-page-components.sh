#!/bin/bash

# Fix Page Components - Next.js 15 Compatibility
# Updates all page components to use Promise<params>

set -e

echo "🔧 Fixing Page Components for Next.js 15"
echo "========================================"

LOG_FILE="test-reports/page-components-fixes.log"

mkdir -p "test-reports"

echo "📋 Page Components Fixes Started: $(date)" | tee "$LOG_FILE"

# Fix snapshots page
if [ -f "src/app/snapshots/[id]/page.tsx" ]; then
  echo "Fixing snapshots page..." | tee -a "$LOG_FILE"
  
  # Update interface
  sed -i.bak 's/params: {/params: Promise<{/g' "src/app/snapshots/[id]/page.tsx"
  sed -i.bak 's/id: string;/id: string;>/g' "src/app/snapshots/[id]/page.tsx"
  
  # Add await params destructuring after function declaration
  sed -i.bak 's/export default async function SnapshotPage({ params }: SnapshotPageProps) {/export default async function SnapshotPage({ params }: SnapshotPageProps) {\n  const { id } = await params;/g' "src/app/snapshots/[id]/page.tsx"
  
  # Replace params.id with id
  sed -i.bak 's/params\.id/id/g' "src/app/snapshots/[id]/page.tsx"
  
  rm -f "src/app/snapshots/[id]/page.tsx.bak"
fi

# Fix any other page components
for file in src/app/**/[*]/page.tsx; do
  if [ -f "$file" ] && grep -q "params: {" "$file"; then
    echo "Fixing page component: $file" | tee -a "$LOG_FILE"
    
    # Update interface
    sed -i.bak 's/params: {/params: Promise<{/g' "$file"
    sed -i.bak 's/};\s*}/}>}/g' "$file"
    
    # Add await params destructuring if not already present
    if ! grep -q "await params" "$file"; then
      sed -i.bak '/export default async function.*{/a\
  const params_resolved = await params;' "$file"
      
      # Replace params. with params_resolved.
      sed -i.bak 's/params\./params_resolved\./g' "$file"
    fi
    
    rm -f "$file.bak"
  fi
done

echo "✅ Page components fixed" | tee -a "$LOG_FILE"

# Test compilation
echo "Testing compilation..." | tee -a "$LOG_FILE"
npm run build > "test-reports/build-test-after-page-fixes.log" 2>&1 || echo "⚠️  Build test encountered issues" | tee -a "$LOG_FILE"

echo "Completed: $(date)" | tee -a "$LOG_FILE" 