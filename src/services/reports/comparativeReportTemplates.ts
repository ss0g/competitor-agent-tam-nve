import { 
  ComparativeReportTemplate, 
  ComparativeReportSectionTemplate,
  REPORT_TEMPLATES,
  REPORT_SECTIONS 
} from '@/types/comparativeReport';

// Template for comprehensive comparative analysis reports
export const COMPREHENSIVE_TEMPLATE: ComparativeReportTemplate = {
  id: REPORT_TEMPLATES.COMPREHENSIVE,
  name: 'Comprehensive Comparative Analysis',
  description: 'Complete competitive intelligence report with detailed analysis across all dimensions',
  defaultFormat: 'markdown',
  focusAreas: ['features', 'positioning', 'user_experience', 'customer_targeting'],
  analysisDepth: 'comprehensive',
  sectionTemplates: [
    {
      type: REPORT_SECTIONS.EXECUTIVE_SUMMARY,
      title: 'Executive Summary',
      template: `# Executive Summary

## Market Position: {{overallPosition}}
**Opportunity Score:** {{opportunityScore}}/100  
**Threat Level:** {{threatLevel}}  
**Confidence:** {{confidenceScore}}%

### Key Insights
{{#keyStrengths}}
- **Strength:** {{.}}
{{/keyStrengths}}

{{#keyWeaknesses}}
- **Weakness:** {{.}}
{{/keyWeaknesses}}

### Strategic Overview
Our analysis reveals that {{productName}} holds a **{{overallPosition}}** position in the competitive landscape with a {{opportunityScore}}% opportunity score. The {{threatLevel}} threat level indicates {{threatLevelDescription}}.

### Priority Recommendations
{{#immediateRecommendations}}
1. **{{.}}**
{{/immediateRecommendations}}
`,
      order: 1,
      includeCharts: true,
      includeTables: false,
      requiredFields: ['overallPosition', 'opportunityScore', 'threatLevel', 'confidenceScore', 'keyStrengths', 'keyWeaknesses']
    },
    {
      type: REPORT_SECTIONS.FEATURE_COMPARISON,
      title: 'Feature Analysis',
      template: `# Feature Comparison Analysis

## Product Feature Portfolio
{{productName}} offers the following core capabilities:
{{#productFeatures}}
- {{.}}
{{/productFeatures}}

## Competitive Feature Landscape
{{#competitorFeatures}}
### {{competitorName}}
{{#features}}
- {{.}}
{{/features}}
{{/competitorFeatures}}

## Unique Competitive Advantages
{{#uniqueToProduct}}
- **{{.}}** - This represents a key differentiator that sets {{productName}} apart from competitors
{{/uniqueToProduct}}

## Feature Gaps & Opportunities
{{#featureGaps}}
- **Gap:** {{.}} - Consider developing this capability to match or exceed competitor offerings
{{/featureGaps}}

## Innovation Score: {{innovationScore}}/100
Our analysis indicates {{innovationScoreDescription}} based on feature uniqueness and market positioning.
`,
      order: 2,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['productFeatures', 'competitorFeatures', 'uniqueToProduct', 'featureGaps', 'innovationScore']
    },
    {
      type: REPORT_SECTIONS.POSITIONING_ANALYSIS,
      title: 'Market Positioning Analysis',
      template: `# Market Positioning Analysis

## {{productName}} Positioning Strategy

### Primary Message
**"{{primaryMessage}}"**

### Value Proposition
{{valueProposition}}

### Target Audience
{{targetAudience}}

### Key Differentiators
{{#differentiators}}
- {{.}}
{{/differentiators}}

## Competitive Positioning Landscape
{{#competitorPositioning}}
### {{competitorName}}
- **Message:** {{primaryMessage}}
- **Value Prop:** {{valueProposition}}
- **Audience:** {{targetAudience}}
{{/competitorPositioning}}

## Market Opportunities
{{#marketOpportunities}}
- **{{.}}** - Untapped positioning opportunity for growth
{{/marketOpportunities}}

## Messaging Effectiveness Score: {{messagingEffectiveness}}/100
{{messagingEffectivenessDescription}}
`,
      order: 3,
      includeCharts: true,
      includeTables: false,
      requiredFields: ['primaryMessage', 'valueProposition', 'targetAudience', 'differentiators', 'competitorPositioning', 'marketOpportunities', 'messagingEffectiveness']
    },
    {
      type: REPORT_SECTIONS.UX_COMPARISON,
      title: 'User Experience Analysis',
      template: `# User Experience Comparison

## {{productName}} UX Assessment

### Design Quality: {{designQuality}}/100
### Usability Score: {{usabilityScore}}/100
### Navigation: {{navigationStructure}}

### Key User Flows
{{#keyUserFlows}}
- {{.}}
{{/keyUserFlows}}

## Competitive UX Landscape
{{#competitorUX}}
### {{competitorName}}
- **Design Quality:** {{designQuality}}/100
- **Usability:** {{usabilityScore}}/100
- **Navigation:** {{navigationStructure}}
{{/competitorUX}}

## UX Strengths
{{#uxStrengths}}
- **{{.}}**
{{/uxStrengths}}

## UX Improvement Areas
{{#uxWeaknesses}}
- **{{.}}**
{{/uxWeaknesses}}

## Recommended UX Enhancements
{{#uxRecommendations}}
- **{{.}}**
{{/uxRecommendations}}
`,
      order: 4,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['designQuality', 'usabilityScore', 'navigationStructure', 'keyUserFlows', 'competitorUX', 'uxStrengths', 'uxWeaknesses', 'uxRecommendations']
    },
    {
      type: REPORT_SECTIONS.CUSTOMER_TARGETING,
      title: 'Customer Targeting Analysis',
      template: `# Customer Targeting Analysis

## {{productName}} Target Market

### Primary Segments
{{#primarySegments}}
- **{{.}}**
{{/primarySegments}}

### Customer Types
{{#customerTypes}}
- {{.}}
{{/customerTypes}}

### Use Cases
{{#useCases}}
- **{{.}}**
{{/useCases}}

## Competitive Targeting Overview
{{#competitorTargeting}}
### {{competitorName}} Target Market
- **Segments:** {{#primarySegments}}{{.}}{{#unless @last}}, {{/unless}}{{/primarySegments}}
- **Customer Types:** {{#customerTypes}}{{.}}{{#unless @last}}, {{/unless}}{{/customerTypes}}
{{/competitorTargeting}}

## Market Overlap Analysis
{{#targetingOverlap}}
- **{{.}}** - Shared focus area with competitors
{{/targetingOverlap}}

## Untapped Market Segments
{{#untappedSegments}}
- **{{.}}** - Potential expansion opportunity
{{/untappedSegments}}

## Competitive Advantages
{{#competitiveAdvantage}}
- **{{.}}**
{{/competitiveAdvantage}}
`,
      order: 5,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['primarySegments', 'customerTypes', 'useCases', 'competitorTargeting', 'targetingOverlap', 'untappedSegments', 'competitiveAdvantage']
    },
    {
      type: REPORT_SECTIONS.RECOMMENDATIONS,
      title: 'Strategic Recommendations',
      template: `# Strategic Recommendations

## Priority Score: {{priorityScore}}/100

## Immediate Actions (0-3 months)
{{#immediateActions}}
- **{{.}}**
{{/immediateActions}}

## Short-term Initiatives (3-12 months)
{{#shortTermActions}}
- **{{.}}**
{{/shortTermActions}}

## Long-term Strategy (12+ months)
{{#longTermActions}}
- **{{.}}**
{{/longTermActions}}

## Implementation Priorities
Based on our analysis, we recommend focusing on immediate actions that address the most critical competitive gaps while building toward long-term strategic advantages.

### Success Metrics
- Monitor competitor response to implemented changes
- Track market share and customer acquisition improvements
- Measure feature adoption and user engagement
- Assess brand positioning effectiveness

### Risk Mitigation
- Continuously monitor competitive landscape for new threats
- Maintain focus on core value proposition while expanding
- Ensure resource allocation supports priority initiatives
`,
      order: 6,
      includeCharts: false,
      includeTables: true,
      requiredFields: ['priorityScore', 'immediateActions', 'shortTermActions', 'longTermActions']
    }
  ]
};

// Template for executive summary reports
export const EXECUTIVE_TEMPLATE: ComparativeReportTemplate = {
  id: REPORT_TEMPLATES.EXECUTIVE,
  name: 'Executive Summary Report',
  description: 'High-level strategic overview for executive leadership',
  defaultFormat: 'markdown',
  focusAreas: ['positioning', 'customer_targeting'],
  analysisDepth: 'basic',
  sectionTemplates: [
    {
      type: REPORT_SECTIONS.EXECUTIVE_SUMMARY,
      title: 'Executive Summary',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[0].template,
      order: 1,
      includeCharts: true,
      includeTables: false,
      requiredFields: ['overallPosition', 'opportunityScore', 'threatLevel', 'confidenceScore', 'keyStrengths', 'keyWeaknesses']
    },
    {
      type: REPORT_SECTIONS.RECOMMENDATIONS,
      title: 'Strategic Recommendations',
      template: `# Strategic Recommendations

## Key Strategic Priorities

### Immediate Focus
{{#immediateActions}}
- **{{.}}**
{{/immediateActions}}

### Strategic Direction
{{#shortTermActions}}
- **{{.}}**
{{/shortTermActions}}

## Market Position Summary
{{productName}} currently holds a **{{overallPosition}}** position with {{opportunityScore}}% opportunity score. Our analysis indicates {{threatLevel}} competitive threats requiring {{urgencyLevel}} attention.
`,
      order: 2,
      includeCharts: true,
      includeTables: false,
      requiredFields: ['immediateActions', 'shortTermActions', 'overallPosition', 'opportunityScore', 'threatLevel']
    }
  ]
};

// Template for technical/feature-focused reports
export const TECHNICAL_TEMPLATE: ComparativeReportTemplate = {
  id: REPORT_TEMPLATES.TECHNICAL,
  name: 'Technical Competitive Analysis',
  description: 'Detailed technical and feature comparison for product teams',
  defaultFormat: 'markdown',
  focusAreas: ['features', 'user_experience'],
  analysisDepth: 'detailed',
  sectionTemplates: [
    {
      type: REPORT_SECTIONS.EXECUTIVE_SUMMARY,
      title: 'Technical Overview',
      template: `# Technical Competitive Analysis

## Overview
This technical analysis compares {{productName}} against {{competitorCount}} key competitors across feature sets, user experience, and technical capabilities.

**Innovation Score:** {{innovationScore}}/100  
**Technical Confidence:** {{confidenceScore}}%

### Key Technical Findings
{{#keyStrengths}}
- **Strength:** {{.}}
{{/keyStrengths}}

{{#keyWeaknesses}}
- **Gap:** {{.}}
{{/keyWeaknesses}}
`,
      order: 1,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['innovationScore', 'confidenceScore', 'keyStrengths', 'keyWeaknesses', 'competitorCount']
    },
    {
      type: REPORT_SECTIONS.FEATURE_COMPARISON,
      title: 'Feature Analysis',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[1].template,
      order: 2,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['productFeatures', 'competitorFeatures', 'uniqueToProduct', 'featureGaps', 'innovationScore']
    },
    {
      type: REPORT_SECTIONS.UX_COMPARISON,
      title: 'User Experience Analysis',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[3].template,
      order: 3,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['designQuality', 'usabilityScore', 'navigationStructure', 'keyUserFlows', 'competitorUX', 'uxStrengths', 'uxWeaknesses', 'uxRecommendations']
    }
  ]
};

// Template for strategic/business-focused reports
export const STRATEGIC_TEMPLATE: ComparativeReportTemplate = {
  id: REPORT_TEMPLATES.STRATEGIC,
  name: 'Strategic Market Analysis',
  description: 'Business strategy and market positioning focus for strategic planning',
  defaultFormat: 'markdown',
  focusAreas: ['positioning', 'customer_targeting'],
  analysisDepth: 'detailed',
  sectionTemplates: [
    {
      type: REPORT_SECTIONS.EXECUTIVE_SUMMARY,
      title: 'Strategic Overview',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[0].template,
      order: 1,
      includeCharts: true,
      includeTables: false,
      requiredFields: ['overallPosition', 'opportunityScore', 'threatLevel', 'confidenceScore', 'keyStrengths', 'keyWeaknesses']
    },
    {
      type: REPORT_SECTIONS.POSITIONING_ANALYSIS,
      title: 'Market Positioning',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[2].template,
      order: 2,
      includeCharts: true,
      includeTables: false,
      requiredFields: ['primaryMessage', 'valueProposition', 'targetAudience', 'differentiators', 'competitorPositioning', 'marketOpportunities', 'messagingEffectiveness']
    },
    {
      type: REPORT_SECTIONS.CUSTOMER_TARGETING,
      title: 'Customer Targeting',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[4].template,
      order: 3,
      includeCharts: true,
      includeTables: true,
      requiredFields: ['primarySegments', 'customerTypes', 'useCases', 'competitorTargeting', 'targetingOverlap', 'untappedSegments', 'competitiveAdvantage']
    },
    {
      type: REPORT_SECTIONS.RECOMMENDATIONS,
      title: 'Strategic Recommendations',
      template: COMPREHENSIVE_TEMPLATE.sectionTemplates[5].template,
      order: 4,
      includeCharts: false,
      includeTables: true,
      requiredFields: ['priorityScore', 'immediateActions', 'shortTermActions', 'longTermActions']
    }
  ]
};

// Template registry
export const REPORT_TEMPLATE_REGISTRY: Record<string, ComparativeReportTemplate> = {
  [REPORT_TEMPLATES.COMPREHENSIVE]: COMPREHENSIVE_TEMPLATE,
  [REPORT_TEMPLATES.EXECUTIVE]: EXECUTIVE_TEMPLATE,
  [REPORT_TEMPLATES.TECHNICAL]: TECHNICAL_TEMPLATE,
  [REPORT_TEMPLATES.STRATEGIC]: STRATEGIC_TEMPLATE
};

// Helper function to get template by ID
export function getReportTemplate(templateId: string): ComparativeReportTemplate | null {
  return REPORT_TEMPLATE_REGISTRY[templateId] || null;
}

// Helper function to list available templates
export function listAvailableTemplates(): ComparativeReportTemplate[] {
  return Object.values(REPORT_TEMPLATE_REGISTRY);
} 