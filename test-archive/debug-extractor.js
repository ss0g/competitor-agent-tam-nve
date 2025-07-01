const { enhancedProjectExtractor } = require('./src/lib/chat/enhancedProjectExtractor.ts');

const message = `user@company.com
Weekly
Good Chop Analysis
https://goodchop.com
Product: Good Chop
Industry: Food Delivery`;

console.log('Input lines:');
const lines = message.trim().split('\n').filter(line => line.trim());
lines.forEach((line, i) => console.log(`${i}: "${line}"`));

console.log('\nTesting product extraction on each line:');
lines.forEach((line, i) => {
  const productMatch = line.match(/(?:product|company|brand)\s*:?\s*([^,\n]+)/i);
  if (productMatch) {
    console.log(`Line ${i}: "${line}" -> Match: "${productMatch[1]}"`);
  }
});

console.log('\nFull result:');
const result = enhancedProjectExtractor.extractProjectData(message);
console.log(JSON.stringify(result, null, 2)); 