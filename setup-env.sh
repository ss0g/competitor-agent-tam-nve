#!/bin/bash

echo "🚀 Setting up Competitor Research Agent Environment"
echo "=================================================="

# Check if .env file exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file
cat > .env << 'EOF'
# AWS Bedrock Configuration (Required for Claude AI)
AWS_ACCESS_KEY_ID=your-aws-access-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-key-here
AWS_REGION=us-east-1

# Database Configuration (Optional - for storing reports in DB)
DATABASE_URL=postgresql://user:password@localhost:5432/competitor_research

# Authentication (Optional - for user management)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Email Configuration (Optional - for sending reports)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password

# AI Models (Optional - additional AI providers)
OPENAI_API_KEY=your-openai-key-here
MISTRAL_API_KEY=your-mistral-key-here

# Application Configuration
NODE_ENV=development
PORT=3000

# Debug Mode (Optional)
DEBUG=false
EOF

echo "✅ Created .env file with template configuration"
echo ""
echo "📝 Next Steps:"
echo "1. Edit .env file with your actual AWS credentials:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - AWS_REGION (if different from us-east-1)"
echo ""
echo "2. Ensure AWS Bedrock access is enabled:"
echo "   - Go to AWS Console → Bedrock → Model access"
echo "   - Enable 'Anthropic Claude 3 Sonnet'"
echo ""
echo "3. Test the integration:"
echo "   node test-integration.js"
echo ""
echo "4. Start the application:"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:3000/chat to start using the agent"
echo ""
echo "📚 For detailed setup instructions, see INTEGRATION_GUIDE.md" 