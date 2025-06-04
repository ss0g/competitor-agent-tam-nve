#!/bin/bash

# AWS Credentials Fix Script
# This script helps you fix the expired AWS credentials issue

echo "🔧 AWS Credentials Fix Script"
echo "=================================="

# Check current AWS CLI status
echo "1. Checking current AWS CLI status..."
if aws sts get-caller-identity 2>/dev/null; then
    echo "✅ AWS CLI credentials are working!"
else
    echo "❌ AWS CLI credentials are expired/invalid"
fi

echo ""
echo "2. Current .env AWS configuration:"
echo "AWS_REGION: $(grep AWS_REGION .env | cut -d'=' -f2)"
echo "AWS_ACCESS_KEY_ID: $(grep AWS_ACCESS_KEY_ID .env | cut -d'=' -f2 | cut -c1-20)..."
echo "AWS_SECRET_ACCESS_KEY: $(grep AWS_SECRET_ACCESS_KEY .env | cut -d'=' -f2 | cut -c1-20)..."
echo "AWS_SESSION_TOKEN: $(grep AWS_SESSION_TOKEN .env | cut -d'=' -f2 | cut -c1-20)..."

echo ""
echo "3. Options to fix:"
echo "   A) Use AWS CLI default credentials (recommended)"
echo "   B) Update with new session token"
echo "   C) Use long-term IAM credentials"

echo ""
read -p "Choose option (A/B/C): " choice

case $choice in
    [Aa]*)
        echo "Setting up to use AWS CLI default credentials..."
        # Backup current .env
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        
        # Update .env to use only region
        sed -i.bak '/AWS_ACCESS_KEY_ID/d; /AWS_SECRET_ACCESS_KEY/d; /AWS_SESSION_TOKEN/d' .env
        
        echo "✅ Updated .env to use AWS CLI default credentials"
        echo "📝 Your old .env has been backed up"
        ;;
    [Bb]*)
        echo "To get new session token:"
        echo "1. Run: aws sso login (if using SSO)"
        echo "2. Or run: aws sts assume-role --role-arn YOUR_ROLE_ARN --role-session-name MySession"
        echo "3. Then manually update the .env file with new credentials"
        ;;
    [Cc]*)
        echo "To use long-term credentials:"
        echo "1. Create IAM user with programmatic access"
        echo "2. Attach necessary policies (Bedrock access)"
        echo "3. Update .env with permanent credentials (no session token)"
        ;;
    *)
        echo "Invalid option selected"
        ;;
esac

echo ""
echo "4. Testing Bedrock connection..."
if command -v node &> /dev/null; then
    node test-bedrock.js
else
    echo "Node.js not found. Run 'node test-bedrock.js' manually to test."
fi

echo ""
echo "🎯 Next steps:"
echo "1. Verify 'node test-bedrock.js' works"
echo "2. Test report generation API"
echo "3. Check application functionality" 