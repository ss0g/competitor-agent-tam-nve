require('dotenv').config();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBedrock() {
  try {
    console.log('Testing AWS Bedrock connection...');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');
    console.log('AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? 'Set' : 'Not set');
    
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'eu-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
      }
    });

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Hello, can you respond with "Bedrock is working"?',
          },
        ],
      }),
    });

    console.log('Sending test request to Bedrock...');
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('Bedrock response:', responseBody.content[0].text);
    console.log('✅ Bedrock connection successful!');
    
  } catch (error) {
    console.error('❌ Bedrock connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.$metadata?.httpStatusCode);
    console.error('Full error:', error);
    
    if (error.message.includes('credentials')) {
      console.error('This appears to be a credentials issue.');
    }
    if (error.message.includes('region')) {
      console.error('This appears to be a region issue.');
    }
  }
}

testBedrock(); 