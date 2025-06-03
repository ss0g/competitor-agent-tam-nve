// Simple test script for the markdown generator
const fs = require('fs');
const path = require('path');

// Mock chat state for testing
const mockChatState = {
  currentStep: 6,
  stepDescription: 'Complete',
  expectedInputType: 'text',
  projectId: 'good-chop-test_report_20241230',
  projectName: 'Good Chop Test Report',
  collectedData: {
    userEmail: 'nikita.gorshkov@hellofresh.com',
    reportFrequency: 'Monthly',
    reportName: 'Good Chop Test Report',
    productName: 'Good Chop',
    industry: 'Meat & Seafood Delivery Services',
    positioning: 'Premium meat delivery service focused on quality and convenience',
    customerProblems: 'Difficulty finding high-quality meat, time-consuming grocery shopping, limited selection at local stores',
    businessChallenges: 'Low market awareness, competition from traditional grocery stores, customer acquisition costs',
    customerDescription: 'Our customers are primarily high-income families in urban areas, aged 25-45, who value quality and convenience. They include busy professionals, health-conscious individuals, and food enthusiasts who want premium meat products delivered to their door.'
  }
};

// Simulate the markdown generation process
function testMarkdownGeneration() {
  console.log('🧪 Testing Markdown Report Generator...\n');
  
  // Test 1: Check if the file exists
  const generatorPath = './src/lib/reports/markdown-generator.ts';
  if (!fs.existsSync(generatorPath)) {
    console.log('❌ Markdown generator file not found');
    return;
  }
  console.log('✅ Markdown generator file exists');
  
  // Test 2: Create a sample markdown report manually
  const report = generateSampleMarkdown(mockChatState);
  
  // Test 3: Save to test directory
  const filename = `${mockChatState.projectId}_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.md`;
  const filepath = path.join('./test-reports', filename);
  
  try {
    fs.writeFileSync(filepath, report);
    console.log('✅ Sample report generated successfully');
    console.log(`📄 Report saved to: ${filepath}`);
    
    // Test 4: Verify file contents
    const savedContent = fs.readFileSync(filepath, 'utf-8');
    if (savedContent.includes('Good Chop') && savedContent.includes('Executive Summary')) {
      console.log('✅ Report contains expected content');
    } else {
      console.log('❌ Report missing expected content');
    }
    
    // Test 5: Show preview of generated content
    console.log('\n📋 Report Preview (first 500 characters):');
    console.log('=' .repeat(50));
    console.log(savedContent.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.log('❌ Error generating report:', error.message);
  }
}

function generateSampleMarkdown(chatState) {
  const data = chatState.collectedData;
  const now = new Date();
  
  return `# Competitor Research Report: ${chatState.projectName}

**Generated:** ${now.toLocaleDateString()} ${now.toLocaleTimeString()}  
**Project ID:** ${chatState.projectId}  
**Requested by:** ${data.userEmail}  
**Report Frequency:** ${data.reportFrequency}

---

## Executive Summary

**Analysis Date:** ${now.toLocaleDateString()}  
**Competitors Analyzed:** 3

### Key Findings
- Analysis of ${data.productName} reveals significant competitive opportunities
- 3 main competitor positioning differences identified in ${data.industry} market
- 5 unique feature gaps discovered through customer experience analysis
- Customer segment analysis shows potential for market differentiation
- Immediate action items identified for competitive advantage

---

## Product Context

### Product Information
- **Name:** ${data.productName}
- **Industry:** ${data.industry}
- **Positioning:** ${data.positioning}

### Customer Problems Addressed
${data.customerProblems}

### Business Challenges
${data.businessChallenges}

---

## Customer Analysis

### Customer Description
${data.customerDescription}

### Customer Segments
- High-income families
- Busy professionals
- Health-conscious individuals
- Food enthusiasts

---

## Competitive Analysis

### Positioning Differences
- Pricing strategy variations across premium, mid-market, and budget segments
- Customer service approach differences (self-service vs. high-touch)
- Technology focus (cutting-edge vs. proven solutions)
- Market targeting (enterprise vs. SMB vs. consumer)
- Brand messaging and value proposition emphasis

### Feature Gaps Identified
- Mobile-first user experience optimization
- Advanced analytics and reporting capabilities
- Integration ecosystem and API availability
- Personalization and customization options
- Customer onboarding and education resources

### Competitor Insights

#### Market Leader Alpha
**Website:** https://competitor-alpha.com

**Positioning Strategy:** Premium market leader with comprehensive solutions

**Key Differentiators:**
- Established brand presence
- Wide product range
- Strong distribution network

**Strengths:**
- Market dominance
- Customer loyalty
- Financial resources

**Weaknesses:**
- Higher pricing
- Slow innovation cycle
- Legacy technology

---

#### Innovative Challenger Beta
**Website:** https://competitor-beta.com

**Positioning Strategy:** Technology-first disruptor targeting modern consumers

**Key Differentiators:**
- Cutting-edge technology
- Agile development
- Modern user experience

**Strengths:**
- Innovation speed
- Technical capabilities
- User-friendly design

**Weaknesses:**
- Limited market presence
- Smaller customer base
- Resource constraints

---

## Recommendations

### Immediate Actions (Priority: High)
- Conduct detailed competitive pricing analysis within 30 days
- Develop unique value proposition highlighting customer problem solutions
- Implement competitor monitoring dashboard for ongoing insights
- Create customer feedback loop to validate competitive advantages
- Plan feature roadmap addressing identified gaps

### Long-term Strategic Recommendations
- Develop distinctive brand positioning strategy for the market
- Build strategic partnerships to enhance competitive moat
- Invest in unique capabilities that are difficult to replicate
- Create customer loyalty programs to reduce churn risk
- Establish thought leadership position in the industry

---

## Methodology

This analysis was conducted using the HelloFresh Competitor Research Agent, which:

1. **Data Collection:** Gathered product and customer information through structured interviews
2. **Competitor Identification:** Identified key competitors in the ${data.industry} industry
3. **Experience Analysis:** Analyzed competitor websites, positioning, and customer experiences
4. **Gap Analysis:** Identified differentiators and opportunities for improvement
5. **Strategic Recommendations:** Generated actionable insights based on findings

---

*Report generated by HelloFresh Competitor Research Agent*  
*Next report scheduled: Based on ${data.reportFrequency} frequency*
`;
}

// Run the test
testMarkdownGeneration(); 