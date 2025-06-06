require('dotenv').config();
const { parseFrequency, frequencyToString, frequencyToCronExpression } = require('./src/utils/frequencyParser.ts');

console.log('🧪 Testing Frequency Parsing Functionality\n');

// Test different frequency inputs
const testInputs = [
  'weekly',
  'daily',
  'monthly', 
  'bi-weekly',
  'every week',
  'once a month',
  'every day',
  'invalid input',
  'MONTHLY REPORTS',
  'Weekly'
];

console.log('📝 Testing frequency parsing:\n');

testInputs.forEach(input => {
  try {
    const parsed = parseFrequency(input);
    console.log(`Input: "${input}"`);
    console.log(`  → Frequency: ${parsed.frequency}`);
    console.log(`  → Display: ${frequencyToString(parsed.frequency)}`);
    console.log(`  → Cron: ${parsed.cronExpression}`);
    console.log(`  → Description: ${parsed.description}`);
    console.log();
  } catch (error) {
    console.error(`❌ Error parsing "${input}":`, error.message);
  }
});

// Test cron expression generation
console.log('⏰ Testing cron expression generation:\n');

const frequencies = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'];

frequencies.forEach(freq => {
  try {
    const cron = frequencyToCronExpression(freq);
    console.log(`${freq}: ${cron}`);
  } catch (error) {
    console.error(`❌ Error generating cron for ${freq}:`, error.message);
  }
});

console.log('\n✅ Frequency parsing tests completed!'); 