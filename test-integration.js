// Load environment variables from .env file
require('dotenv').config();

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { fromIni } = require('@aws-sdk/credential-providers');

async function testClaudeIntegration() {
  console.log('🧪 Testing Claude Integration via AWS Bedrock...\n');

  // Use AWS CLI credentials by default (recommended approach)
  let credentials;
  let credentialSource = '';
  
  try {
    console.log('✅ Using AWS CLI credentials (default profile)');
    credentials = fromIni(); // Uses ~/.aws/credentials
    credentialSource = 'AWS CLI default profile';
  } catch (error) {
    console.error('❌ Could not load credentials from AWS CLI');
    console.error('Please run: aws configure');
    console.error('Or set up AWS SSO with: aws configure sso');
    process.exit(1);
  }

  // Get region from .env or use default
  const region = process.env.AWS_REGION || 'us-east-1';
  console.log(`   - AWS Region: ${region}`);

  try {
    // Initialize Bedrock client with AWS CLI credentials
    const bedrockClient = new BedrockRuntimeClient({
      region: region,
      credentials: credentials,
    });

    console.log(`\n🔗 Connecting to AWS Bedrock (${credentialSource})...`);

    // Create test command with correct API version
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31', // Correct version for Bedrock
        max_tokens: 100,
        temperature: 0.7,
        system: 'You are a helpful assistant. Respond briefly and clearly.',
        messages: [
          {
            role: 'user',
            content: 'Hello Claude! Please confirm you are working by saying "Claude AI is operational via AWS Bedrock" and nothing else.',
          },
        ],
      }),
    });

    // Call Claude
    console.log('🤖 Sending test message to Claude...');
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('\n✅ Claude Response:');
    console.log(`   "${responseBody.content[0].text}"`);
    console.log('\n🎉 Integration test successful!');
    console.log('\nYour competitor research agent is ready to use Claude AI for analysis.');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open http://localhost:3000 in your browser');
    console.log('3. Begin a new competitor analysis project');

  } catch (error) {
    console.error('\n❌ Integration test failed:');
    
    if (error.message.includes('expired')) {
      console.error('   - Your AWS credentials have expired.');
      console.error('   - Get fresh credentials and run: aws configure');
      console.error('   - For SSO users: aws sso login');
    } else if (error.message.includes('AccessDenied')) {
      console.error('   - Access denied. Check your AWS credentials and Bedrock permissions.');
      console.error('   - Ensure you have enabled Claude 3 Sonnet in AWS Bedrock Model Access.');
    } else if (error.message.includes('ValidationException')) {
      console.error('   - Invalid request format. Check your AWS configuration.');
    } else if (error.message.includes('ResourceNotFound') || error.message.includes('not authorized')) {
      console.error('   - Claude model not available or not enabled.');
      console.error(`   - Current region: ${region}`);
      console.error('   - Go to AWS Console → Bedrock → Model access');
      console.error('   - Enable "Anthropic Claude 3 Sonnet"');
    } else {
      console.error(`   - ${error.message}`);
    }
    
    console.error('\n🔧 Troubleshooting Steps:');
    console.error('1. Check AWS CLI: aws sts get-caller-identity');
    console.error('2. Go to AWS Console → Bedrock → Model access');
    console.error('3. Enable "Anthropic Claude 3 Sonnet"');
    console.error('4. Ensure your IAM user/role has Bedrock permissions');
    console.error('5. Try a different region if Claude is not available in eu-west-1');
    process.exit(1);
  }
}

// Run the test
testClaudeIntegration().catch(console.error); 