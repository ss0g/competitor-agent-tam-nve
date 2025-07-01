import { ChatState } from '@/types/chat';

/**
 * Comprehensive Project Requirements Interface
 * Defines all required and optional fields for single-form collection
 */
export interface ComprehensiveProjectRequirements {
  // Core Project Info (Required)
  userEmail: string;
  reportFrequency: string; // Weekly, Monthly, Quarterly
  projectName: string;
  
  // Product Info (Required)
  productName: string;
  productUrl: string;
  
  // Business Context (Required)
  industry: string;
  positioning: string;
  customerData: string;
  userProblem: string;
  
  // Optional Enhancement Fields
  competitorHints?: string[];
  focusAreas?: string[];
  reportTemplate?: string;
}

/**
 * Validation Result Interface
 * Provides detailed feedback on requirement completeness and validity
 */
export interface RequirementsValidationResult {
  isValid: boolean;
  completeness: number; // Percentage 0-100
  missingRequiredFields: string[];
  invalidFields: { field: string; reason: string; suggestion: string }[];
  extractedData: Partial<ComprehensiveProjectRequirements>;
  confidence: { [key: string]: number }; // Confidence score per field (0-100)
  suggestions: string[];
}

/**
 * Field Extraction Configuration
 */
interface FieldExtractionConfig {
  patterns: RegExp[];
  keywords: string[];
  validator?: (value: string) => boolean;
  cleaner?: (value: string) => string;
}

/**
 * Prompt generation options for customization
 */
export interface PromptOptions {
  includeExamples?: boolean;
  industry?: string;
  tone?: 'professional' | 'friendly' | 'concise';
  showOptionalFields?: boolean;
  emphasizeSpeed?: boolean;
  includeContextualHelp?: boolean;
}

/**
 * Comprehensive Requirements Collector
 * Handles single-form collection of all project requirements
 */
export class ComprehensiveRequirementsCollector {
  private readonly requiredFields = [
    'userEmail', 'reportFrequency', 'projectName', 
    'productName', 'productUrl', 'industry', 
    'positioning', 'customerData', 'userProblem'
  ];

  private readonly fieldExtractionConfigs: { [key: string]: FieldExtractionConfig } = {
    userEmail: {
      patterns: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        /email\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
        /contact\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi
      ],
      keywords: ['email', 'contact', 'address'],
      validator: (email: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(email)
    },
    reportFrequency: {
      patterns: [
        /\b(weekly|monthly|quarterly|daily|bi-weekly|biweekly)\b/gi,
        /(?:frequency|schedule|report)\s*:?\s*(weekly|monthly|quarterly|daily|bi-weekly|biweekly)/gi,
        /(?:every|each)\s+(week|month|quarter|day)/gi
      ],
      keywords: ['weekly', 'monthly', 'quarterly', 'daily', 'frequency', 'schedule'],
      cleaner: (value: string) => {
        const normalized = value.toLowerCase().trim();
        if (normalized.includes('week')) return 'Weekly';
        if (normalized.includes('month')) return 'Monthly';
        if (normalized.includes('quarter')) return 'Quarterly';
        if (normalized.includes('day')) return 'Daily';
        return value;
      }
    },
    productUrl: {
      patterns: [
        /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
        /(?:website|url|link|site)\s*:?\s*(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
      ],
      keywords: ['https', 'http', 'www', 'website', 'url'],
      validator: (url: string) => /^https?:\/\/[^\s<>"{}|\\^`\[\]]+$/.test(url),
      cleaner: (url: string) => {
        // Remove trailing slashes and query parameters for consistency
        return url.replace(/\/+$/, '').split('?')[0];
      }
    }
  };

  /**
   * Generates comprehensive single-form prompt with customization options
   */
  public generateComprehensivePrompt(options: PromptOptions = {}): string {
    const {
      includeExamples = false,
      industry,
      tone = 'friendly',
      showOptionalFields = true,
      emphasizeSpeed = true,
      includeContextualHelp = true
    } = options;

    const greeting = this.getGreeting(tone, emphasizeSpeed);
    const sections = this.buildPromptSections(industry, includeExamples, showOptionalFields);
    const instructions = this.getInputInstructions(tone, includeContextualHelp);
    const footer = this.getPromptFooter(tone);

    return `${greeting}\n\n${sections}\n\n${instructions}\n\n${footer}`;
  }

  /**
   * Generates industry-specific prompt with tailored examples
   */
  public generateIndustrySpecificPrompt(industry: string): string {
    return this.generateComprehensivePrompt({
      includeExamples: true,
      industry,
      tone: 'professional',
      includeContextualHelp: true
    });
  }

  /**
   * Generates a concise prompt for experienced users
   */
  public generateConcisePrompt(): string {
    return this.generateComprehensivePrompt({
      tone: 'concise',
      showOptionalFields: false,
      emphasizeSpeed: false,
      includeContextualHelp: false
    });
  }

  /**
   * Generates prompt for partial submission (missing fields)
   */
  public generatePartialPrompt(missingFields: string[], existingData: Partial<ComprehensiveProjectRequirements>): string {
    const fieldDescriptions = missingFields.map(field => {
      const desc = this.getFieldDescription(field);
      return `• **${desc.name}**: ${desc.description}${desc.example ? ` (e.g., ${desc.example})` : ''}`;
    }).join('\n');

    return `📋 **Almost Complete!** You've provided ${this.requiredFields.length - missingFields.length}/9 required fields.

**Still need:**
${fieldDescriptions}

**Already have:**
${this.formatExistingData(existingData)}

Please provide the missing information in any format you prefer. I'll combine it with what you've already given me! 🚀`;
  }

  /**
   * Helper methods for prompt generation
   */
  private getGreeting(tone: string, emphasizeSpeed: boolean): string {
    const speedText = emphasizeSpeed ? " This replaces our multi-step process and gets you started faster!" : "";
    
    switch (tone) {
      case 'professional':
        return `**Competitor Research Agent**\n\nTo create your comprehensive competitive analysis, please provide all required information below.${speedText}`;
      case 'concise':
        return `**Competitor Analysis Setup**\n\nProvide all required fields:`;
      default: // friendly
        return `🚀 **Welcome to the Competitor Research Agent!**\n\nTo create your comprehensive competitive analysis, I need all the following information at once.${speedText}`;
    }
  }

  private buildPromptSections(industry?: string, includeExamples: boolean = false, showOptionalFields: boolean = true): string {
    const sections = [
      this.buildContactSection(includeExamples),
      this.buildProductSection(industry, includeExamples),
      this.buildBusinessSection(industry, includeExamples)
    ];

    if (showOptionalFields) {
      sections.push(this.buildOptionalSection(includeExamples));
    }

    return sections.join('\n\n');
  }

  private buildContactSection(includeExamples: boolean): string {
    const examples = includeExamples ? ' (e.g., john@company.com, Weekly, Market Analysis Project)' : '';
    return `**📧 CONTACT & SCHEDULING (Required):**
1. **Email address** - Where should I send reports?
2. **Report frequency** - Weekly, Monthly, or Quarterly?
3. **Project name** - What should we call this analysis?${examples}`;
  }

  private buildProductSection(industry?: string, includeExamples: boolean = false): string {
    const industryExample = industry || 'SaaS';
    const examples = includeExamples ? 
      ` (e.g., MyProduct, https://myproduct.com, ${industryExample})` : '';
    
    return `**🎯 PRODUCT INFORMATION (Required):**
4. **Product name** - What's your product called?
5. **Product website URL** - Full URL for analysis (https://...)
6. **Industry/Market** - What sector are you in?${examples}`;
  }

  private buildBusinessSection(industry?: string, includeExamples: boolean = false): string {
    const examples = includeExamples ? this.getIndustryExamples(industry) : '';
    
    return `**📊 BUSINESS CONTEXT (Required):**
7. **Product positioning** - Value props, target market, competitive advantage
8. **Customer data** - Demographics, segments, size, characteristics
9. **User problems** - Core problems your product solves${examples}`;
  }

  private buildOptionalSection(includeExamples: boolean): string {
    const examples = includeExamples ? ' (e.g., Competitor A, Competitor B)' : '';
    return `**💡 OPTIONAL ENHANCEMENTS:**
10. **Specific competitors** - Any particular companies to focus on?${examples}
11. **Analysis focus areas** - Pricing, features, marketing, etc.?
12. **Report template** - Any specific format preferences?`;
  }

  private getIndustryExamples(industry?: string): string {
    const examples: { [key: string]: string } = {
      'saas': '\n(e.g., "B2B productivity platform for teams", "SMB customers 10-500 employees", "Manual workflow inefficiencies")',
      'ecommerce': '\n(e.g., "Direct-to-consumer fashion brand", "Millennials aged 25-35 in urban areas", "Finding sustainable clothing options")',
      'fintech': '\n(e.g., "Digital banking for freelancers", "Independent contractors and gig workers", "Traditional banks lack freelancer-specific features")',
      'healthcare': '\n(e.g., "Telehealth platform for rural areas", "Patients in underserved regions", "Limited access to specialists")',
      'food': '\n(e.g., "Premium meal delivery service", "Health-conscious urban professionals", "Lack of healthy convenient meal options")'
    };

    if (!industry) return '';
    
    const normalizedIndustry = industry.toLowerCase();
    for (const [key, example] of Object.entries(examples)) {
      if (normalizedIndustry.includes(key)) {
        return example;
      }
    }
    
    return '';
  }

  private getInputInstructions(tone: string, includeContextualHelp: boolean): string {
    const baseInstructions = `**📝 HOW TO RESPOND:**
You can provide information in any format that works for you:
- **Numbered list** (1. email@company.com, 2. Weekly, 3. Project Name...)
- **Natural language** (My email is..., I want weekly reports for...)
- **Mixed format** (Email: john@company.com, I need monthly reports...)`;

    if (!includeContextualHelp) {
      return baseInstructions;
    }

    const contextualHelp = tone === 'concise' ? 
      '\n\nProvide all required information above.' :
      '\n\nI\'ll intelligently parse your response and ask for any missing required information.';

    return baseInstructions + contextualHelp;
  }

  private getPromptFooter(tone: string): string {
    switch (tone) {
      case 'professional':
        return 'Please provide the required information to proceed with your competitive analysis.';
      case 'concise':
        return 'Ready for your input.';
      default: // friendly
        return 'Ready when you are! 🎉';
    }
  }

  private getFieldDescription(field: string): { name: string; description: string; example?: string } {
    const descriptions: { [key: string]: { name: string; description: string; example?: string } } = {
      userEmail: { name: 'Email', description: 'Your email address for reports', example: 'john@company.com' },
      reportFrequency: { name: 'Frequency', description: 'How often you want reports', example: 'Weekly' },
      projectName: { name: 'Project Name', description: 'Name for this analysis project', example: 'Q1 Market Analysis' },
      productName: { name: 'Product Name', description: 'Your product\'s name', example: 'MyProduct' },
      productUrl: { name: 'Product URL', description: 'Your product\'s website', example: 'https://myproduct.com' },
      industry: { name: 'Industry', description: 'Your market sector', example: 'SaaS' },
      positioning: { name: 'Positioning', description: 'Your value proposition and target market' },
      customerData: { name: 'Customer Data', description: 'Demographics and customer characteristics' },
      userProblem: { name: 'User Problems', description: 'Problems your product solves' }
    };

    return descriptions[field] || { name: field, description: 'Required field' };
  }

  private formatExistingData(data: Partial<ComprehensiveProjectRequirements>): string {
    const formatted: string[] = [];
    
    if (data.userEmail) formatted.push(`📧 Email: ${data.userEmail}`);
    if (data.reportFrequency) formatted.push(`📅 Frequency: ${data.reportFrequency}`);
    if (data.projectName) formatted.push(`📋 Project: ${data.projectName}`);
    if (data.productName) formatted.push(`🎯 Product: ${data.productName}`);
    if (data.productUrl) formatted.push(`🌐 URL: ${data.productUrl}`);
    if (data.industry) formatted.push(`🏢 Industry: ${data.industry}`);
    
    return formatted.length > 0 ? formatted.join('\n') : 'No information collected yet';
  }

  /**
   * Enhanced comprehensive parser for Phase 2.2
   * Features: Advanced NLP, multi-format support, contextual intelligence
   */
  public parseComprehensiveInput(message: string): RequirementsValidationResult {
    // Phase 2.2 Enhancement: Preprocessing for better parsing
    const preprocessedMessage = this.preprocessInput(message);
    
    const extractedData: Partial<ComprehensiveProjectRequirements> = {};
    const confidence: { [key: string]: number } = {};
    const invalidFields: { field: string; reason: string; suggestion: string }[] = [];
    const suggestions: string[] = [];

    // Phase 2.2: Advanced parsing strategy selection
    const parsingStrategy = this.determineParsingStrategy(preprocessedMessage);
    
    // Apply the optimal parsing strategy
    switch (parsingStrategy) {
      case 'numbered_list':
        this.parseNumberedListFormat(preprocessedMessage, extractedData, confidence);
        break;
      case 'bullet_points':
        this.parseBulletPointFormat(preprocessedMessage, extractedData, confidence);
        break;
      case 'natural_language':
        this.parseNaturalLanguageFormat(preprocessedMessage, extractedData, confidence);
        break;
      case 'mixed_format':
      default:
        this.parseMixedFormat(preprocessedMessage, extractedData, confidence);
        break;
    }

    // Phase 2.2: Enhanced field validation with context awareness
    this.validateExtractedFields(extractedData, invalidFields, preprocessedMessage);

    // Email extraction with enhanced validation (only if not already extracted)
    if (!extractedData.userEmail) {
      const emailResult = this.extractField(preprocessedMessage, 'userEmail');
      if (emailResult.value) {
        extractedData.userEmail = emailResult.value;
        confidence.userEmail = emailResult.confidence;
      } else if (emailResult.candidates.length > 0) {
        invalidFields.push({
          field: 'userEmail',
          reason: 'Invalid email format detected',
          suggestion: `Found "${emailResult.candidates[0]}" - please provide valid email format: user@company.com`
        });
      }
    }

    // Frequency extraction with enhanced patterns (only if not already extracted)
    if (!extractedData.reportFrequency) {
      const frequencyResult = this.extractField(preprocessedMessage, 'reportFrequency');
      if (frequencyResult.value) {
        extractedData.reportFrequency = frequencyResult.value;
        confidence.reportFrequency = frequencyResult.confidence;
      } else if (frequencyResult.candidates.length > 0) {
        invalidFields.push({
          field: 'reportFrequency',
          reason: 'Unclear frequency specification',
          suggestion: `Found "${frequencyResult.candidates[0]}" - please specify: Weekly, Monthly, or Quarterly`
        });
      }
    }

    // URL extraction with enhanced validation (only if not already extracted)
    if (!extractedData.productUrl) {
      const urlResult = this.extractField(preprocessedMessage, 'productUrl');
      if (urlResult.value) {
        extractedData.productUrl = urlResult.value;
        confidence.productUrl = urlResult.confidence;
      } else if (urlResult.candidates.length > 0) {
        invalidFields.push({
          field: 'productUrl',
          reason: 'Invalid URL format',
          suggestion: `Found "${urlResult.candidates[0]}" - please provide full URL starting with https://`
        });
      }
    }

    // Phase 2.2: Contextual field extraction with industry intelligence
    this.extractFieldsWithContext(preprocessedMessage, extractedData, confidence);

    // Phase 2.2: Smart completeness calculation with partial credit
    const completeness = this.calculateSmartCompleteness(extractedData, confidence);

    // Identify missing required fields
    const missingRequiredFields = this.requiredFields.filter(
      field => !extractedData[field as keyof ComprehensiveProjectRequirements]
    );

    // Phase 2.2: Intelligent suggestion generation
    this.generateIntelligentSuggestions(extractedData, missingRequiredFields, suggestions, parsingStrategy);

    const isValid = missingRequiredFields.length === 0 && invalidFields.length === 0;

    return {
      isValid,
      completeness,
      missingRequiredFields,
      invalidFields,
      extractedData,
      confidence,
      suggestions
    };
  }

  /**
   * Phase 2.2: Input preprocessing for better parsing accuracy
   */
  private preprocessInput(message: string): string {
    let processed = message.trim();
    
    // Normalize line breaks
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Clean up excessive whitespace but preserve line structure
    processed = processed.replace(/\n\s*\n/g, '\n'); // Remove empty lines
    // Replace multiple spaces/tabs on same line with single space, but preserve newlines
    processed = processed.replace(/[ \t]+/g, ' ');
    
    // Normalize bullet points
    processed = processed.replace(/[•▪▫◦‣⁃]/g, '•');
    
    // Normalize quotation marks
    processed = processed.replace(/[""'']/g, '"');
    
    // Normalize dashes
    processed = processed.replace(/[–—]/g, '-');
    
    return processed;
  }

  /**
   * Phase 2.2: Intelligent parsing strategy determination
   */
  private determineParsingStrategy(message: string): 'numbered_list' | 'bullet_points' | 'natural_language' | 'mixed_format' {
    const lines = message.split('\n').filter(line => line.trim());
    
    // Check for numbered list (1., 2., 3., etc.)
    const numberedLines = lines.filter(line => /^\s*\d+\.?\s/.test(line)).length;
    if (numberedLines >= 3) return 'numbered_list';
    
    // Check for bullet points
    const bulletLines = lines.filter(line => /^\s*[•\-\*]\s/.test(line)).length;
    if (bulletLines >= 3) return 'bullet_points';
    
    // Check for natural language patterns
    const sentenceCount = (message.match(/[.!?]+/g) || []).length;
    const wordCount = message.split(/\s+/).length;
    if (sentenceCount >= 2 && wordCount > 50) return 'natural_language';
    
    return 'mixed_format';
  }

  /**
   * Phase 2.2: Enhanced numbered list parsing
   */
  private parseNumberedListFormat(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    this.extractFromNumberedList(message, extractedData, confidence);
    
    // Boost confidence for numbered list format
    Object.keys(confidence).forEach(key => {
      confidence[key] = Math.min(confidence[key] + 10, 100);
    });
  }

  /**
   * Phase 2.2: Bullet point format parsing
   */
  private parseBulletPointFormat(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const lines = message.split('\n').filter(line => line.trim());
    const bulletItems: string[] = [];
    
    for (const line of lines) {
      const bulletMatch = line.match(/^\s*[•\-\*]\s*(.+)/);
      if (bulletMatch) {
        bulletItems.push(bulletMatch[1].trim());
      }
    }
    
    // Process bullet items like numbered items
    this.processBulletItems(bulletItems, extractedData, confidence);
  }

  /**
   * Phase 2.2: Advanced natural language parsing
   */
  private parseNaturalLanguageFormat(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Extract sentences for contextual analysis
    const sentences = message.split(/[.!?]+/).filter(s => s.trim());
    
    // Apply semantic extraction patterns
    this.applySemanticPatterns(sentences, extractedData, confidence);
    
    // Use contextual clues for better extraction
    this.extractFromContext(message, extractedData, confidence);
  }

  /**
   * Phase 2.2: Mixed format parsing with intelligent detection
   */
  private parseMixedFormat(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Try numbered list extraction first
    this.extractFromNumberedList(message, extractedData, confidence);
    
    // Fill gaps with pattern matching
    if (!extractedData.projectName) this.extractProjectName(message, extractedData, confidence);
    if (!extractedData.productName) this.extractProductName(message, extractedData, confidence);
    if (!extractedData.industry) this.extractIndustry(message, extractedData, confidence);
    if (!extractedData.positioning) this.extractPositioning(message, extractedData, confidence);
    if (!extractedData.customerData) this.extractCustomerData(message, extractedData, confidence);
    if (!extractedData.userProblem) this.extractUserProblem(message, extractedData, confidence);
    this.extractOptionalFields(message, extractedData, confidence);
  }

  /**
   * Phase 2.2: Enhanced field validation with context awareness
   */
  private validateExtractedFields(extractedData: Partial<ComprehensiveProjectRequirements>, invalidFields: { field: string; reason: string; suggestion: string }[], message: string) {
    // Validate email format if present
    if (extractedData.userEmail && !this.fieldExtractionConfigs.userEmail.validator?.(extractedData.userEmail)) {
      invalidFields.push({
        field: 'userEmail',
        reason: 'Email format appears invalid',
        suggestion: 'Please provide a valid email address (e.g., user@company.com)'
      });
    }
    
    // Validate URL format if present
    if (extractedData.productUrl && !this.fieldExtractionConfigs.productUrl.validator?.(extractedData.productUrl)) {
      invalidFields.push({
        field: 'productUrl',
        reason: 'URL format appears invalid',
        suggestion: 'Please provide a valid URL starting with https:// or http://'
      });
    }
    
    // Validate frequency if present
    if (extractedData.reportFrequency) {
      const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
      if (!validFrequencies.some(freq => extractedData.reportFrequency!.toLowerCase().includes(freq))) {
        invalidFields.push({
          field: 'reportFrequency',
          reason: 'Frequency not recognized',
          suggestion: 'Please specify: Daily, Weekly, Monthly, or Quarterly'
        });
      }
    }
  }

  /**
   * Phase 2.2: Contextual field extraction with industry intelligence
   */
  private extractFieldsWithContext(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Industry-aware extraction
    const detectedIndustry = this.detectIndustryContext(message);
    if (detectedIndustry && !extractedData.industry) {
      extractedData.industry = detectedIndustry;
      confidence.industry = 75;
    }
    
    // Extract remaining fields with contextual hints
    if (!extractedData.projectName) this.extractProjectName(message, extractedData, confidence);
    if (!extractedData.productName) this.extractProductName(message, extractedData, confidence);
    if (!extractedData.positioning) this.extractPositioning(message, extractedData, confidence);
    if (!extractedData.customerData) this.extractCustomerData(message, extractedData, confidence);
    if (!extractedData.userProblem) this.extractUserProblem(message, extractedData, confidence);
    this.extractOptionalFields(message, extractedData, confidence);
  }

  /**
   * Phase 2.2: Smart completeness calculation with partial credit
   */
  private calculateSmartCompleteness(extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }): number {
    let weightedScore = 0;
    let totalWeight = 0;
    
    for (const field of this.requiredFields) {
      const value = extractedData[field as keyof ComprehensiveProjectRequirements];
      const fieldConfidence = confidence[field] || 0;
      
      if (value) {
        // Full credit for present fields, weighted by confidence
        weightedScore += (fieldConfidence / 100) * 100;
      }
      totalWeight += 100;
    }
    
    return Math.round((weightedScore / totalWeight) * 100);
  }

  /**
   * Phase 2.2: Intelligent suggestion generation
   */
  private generateIntelligentSuggestions(
    extractedData: Partial<ComprehensiveProjectRequirements>, 
    missingFields: string[], 
    suggestions: string[], 
    parsingStrategy: string
  ) {
    if (missingFields.length > 0) {
      suggestions.push(`Still need: ${missingFields.map(f => this.getFieldDescription(f).name).join(', ')}`);
      
      // Strategy-specific suggestions
      switch (parsingStrategy) {
        case 'numbered_list':
          suggestions.push('✓ Great format! Continue using numbered list (1. 2. 3. ...)');
          break;
        case 'bullet_points':
          suggestions.push('✓ Nice format! You can also use numbered list for better accuracy');
          break;
        case 'natural_language':
          suggestions.push('💡 Try using numbered list format for better extraction accuracy');
          break;
        case 'mixed_format':
          suggestions.push('💡 Consider organizing information in numbered list (1-9) for best results');
          break;
      }
    }

    // Context-aware suggestions
    if (!extractedData.userEmail) {
      suggestions.push('📧 Include your email address for report delivery');
    }
    if (!extractedData.productUrl) {
      suggestions.push('🔗 Include your product website URL (https://yoursite.com)');
    }
    if (!extractedData.industry) {
      suggestions.push('🏢 Specify your industry (e.g., SaaS, Healthcare, E-commerce)');
    }
  }

  // Phase 2.2: Enhanced helper methods

  /**
   * Process bullet point items similar to numbered list
   */
  private processBulletItems(items: string[], extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Map bullet items to expected order
    items.forEach((item, index) => {
      switch (index) {
        case 0:
          if (this.fieldExtractionConfigs.userEmail.validator?.(item)) {
            extractedData.userEmail = item;
            confidence.userEmail = 90;
          }
          break;
        case 1:
          if (this.fieldExtractionConfigs.reportFrequency.cleaner) {
            const cleaned = this.fieldExtractionConfigs.reportFrequency.cleaner(item);
            if (cleaned !== item) {
              extractedData.reportFrequency = cleaned;
              confidence.reportFrequency = 85;
            }
          }
          break;
        case 2:
          if (item.length > 3) {
            extractedData.projectName = item;
            confidence.projectName = 80;
          }
          break;
        case 3:
          if (item.length > 2) {
            extractedData.productName = item;
            confidence.productName = 80;
          }
          break;
        case 4:
          if (this.fieldExtractionConfigs.productUrl.validator?.(item)) {
            extractedData.productUrl = this.fieldExtractionConfigs.productUrl.cleaner?.(item) || item;
            confidence.productUrl = 85;
          }
          break;
        case 5:
          if (item.length > 2) {
            extractedData.industry = item;
            confidence.industry = 80;
          }
          break;
        case 6:
          if (item.length >= 10) {
            extractedData.positioning = item;
            confidence.positioning = 80;
          }
          break;
        case 7:
          if (item.length >= 10) {
            extractedData.customerData = item;
            confidence.customerData = 80;
          }
          break;
        case 8:
          if (item.length >= 10) {
            extractedData.userProblem = item;
            confidence.userProblem = 80;
          }
          break;
      }
    });
  }

  /**
   * Apply semantic patterns for natural language extraction
   */
  private applySemanticPatterns(sentences: string[], extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    for (const sentence of sentences) {
      // Email pattern
      const emailMatch = sentence.match(/my email is ([^,.\s]+@[^,.\s]+)/i);
      if (emailMatch && !extractedData.userEmail) {
        extractedData.userEmail = emailMatch[1];
        confidence.userEmail = 85;
      }
      
      // Frequency pattern
      const freqMatch = sentence.match(/(?:want|need|prefer)\s+(\w+)\s+reports?/i);
      if (freqMatch && !extractedData.reportFrequency) {
        const freq = this.fieldExtractionConfigs.reportFrequency.cleaner?.(freqMatch[1]);
        if (freq) {
          extractedData.reportFrequency = freq;
          confidence.reportFrequency = 80;
        }
      }
      
      // Project name pattern
      const projectMatch = sentence.match(/(?:project|analysis|study).*?(?:called|named)\s+"([^"]+)"/i);
      if (projectMatch && !extractedData.projectName) {
        extractedData.projectName = projectMatch[1];
        confidence.projectName = 85;
      }
    }
  }

  /**
   * Extract information from broader context
   */
  private extractFromContext(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Industry context extraction
    if (!extractedData.industry) {
      const industryKeywords = ['saas', 'software', 'fintech', 'healthcare', 'retail', 'food', 'delivery', 'ecommerce'];
      for (const keyword of industryKeywords) {
        if (message.toLowerCase().includes(keyword)) {
          extractedData.industry = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          confidence.industry = 70;
          break;
        }
      }
    }
    
    // Product URL context
    if (!extractedData.productUrl) {
      const urlMatch = message.match(/(https?:\/\/[^\s,]+)/i);
      if (urlMatch) {
        const cleaned = this.fieldExtractionConfigs.productUrl.cleaner?.(urlMatch[1]);
        if (cleaned) {
          extractedData.productUrl = cleaned;
          confidence.productUrl = 85;
        }
      }
    }
  }

  /**
   * Detect industry context from message content
   */
  private detectIndustryContext(message: string): string | null {
    const industryPatterns: { [key: string]: RegExp[] } = {
      'SaaS': [/\b(saas|software as a service|cloud software|web app|platform)\b/i],
      'E-commerce': [/\b(ecommerce|e-commerce|online store|marketplace|retail)\b/i],
      'FinTech': [/\b(fintech|financial technology|banking|payments|finance)\b/i],
      'Healthcare': [/\b(healthcare|medical|health|telehealth|hospital)\b/i],
      'Food': [/\b(food|restaurant|meal|delivery|kitchen|cooking)\b/i],
      'Education': [/\b(education|learning|school|university|edtech)\b/i]
    };
    
    for (const [industry, patterns] of Object.entries(industryPatterns)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return industry;
      }
    }
    
    return null;
  }



  /**
   * Creates a user-friendly prompt for missing or invalid fields
   */
  public createMissingFieldsPrompt(validationResult: RequirementsValidationResult): string {
    const { missingRequiredFields, invalidFields, completeness, suggestions } = validationResult;

    let prompt = `📊 **Progress: ${completeness}% Complete**\n\n`;

    if (invalidFields.length > 0) {
      prompt += `❌ **Please fix these issues:**\n`;
      invalidFields.forEach(issue => {
        prompt += `• **${issue.field}**: ${issue.reason}\n  💡 ${issue.suggestion}\n`;
      });
      prompt += '\n';
    }

    if (missingRequiredFields.length > 0) {
      prompt += `📝 **Still need the following required information:**\n`;
      missingRequiredFields.forEach(field => {
        const fieldDescription = this.getFieldDescription(field);
        prompt += `• **${fieldDescription.name}**: ${fieldDescription.description}\n`;
        if (fieldDescription.example) {
          prompt += `  💡 Example: ${fieldDescription.example}\n`;
        }
      });
      prompt += '\n';
    }

    if (suggestions.length > 0) {
      prompt += `💡 **Helpful tips:**\n`;
      suggestions.forEach(suggestion => {
        prompt += `• ${suggestion}\n`;
      });
    }

    prompt += `\nPlease provide the missing information, and I'll create your competitive analysis project! 🚀`;

    return prompt;
  }

  /**
   * Merges new input with existing collected data
   */
  public mergeWithExistingData(
    newData: Partial<ComprehensiveProjectRequirements>,
    existingState: ChatState
  ): Partial<ComprehensiveProjectRequirements> {
    const merged: Partial<ComprehensiveProjectRequirements> = {};
    const existing = existingState.collectedData || {};

    // Map existing chat state fields to comprehensive requirements
    if (existing.userEmail) merged.userEmail = existing.userEmail;
    if (existing.reportFrequency) merged.reportFrequency = existing.reportFrequency;
    if (existing.reportName) merged.projectName = existing.reportName;
    if (existing.productName) merged.productName = existing.productName;
    if (existing.productUrl) merged.productUrl = existing.productUrl;
    if (existing.industry) merged.industry = existing.industry;
    if (existing.positioning) merged.positioning = existing.positioning;
    if (existing.customerData) merged.customerData = existing.customerData;
    if (existing.userProblem) merged.userProblem = existing.userProblem;

    // Override with new data
    Object.assign(merged, newData);

    return merged;
  }

  /**
   * Converts comprehensive requirements to chat state format
   */
  public toChatState(requirements: ComprehensiveProjectRequirements): Partial<ChatState> {
    return {
      collectedData: {
        userEmail: requirements.userEmail,
        reportFrequency: requirements.reportFrequency,
        reportName: requirements.projectName,
        productName: requirements.productName,
        productUrl: requirements.productUrl,
        industry: requirements.industry,
        positioning: requirements.positioning,
        customerData: requirements.customerData,
        userProblem: requirements.userProblem,
        // Store optional fields as JSON string if needed
        competitors: requirements.competitorHints
      }
    };
  }

  /**
   * Validates if requirements are complete and ready for project creation
   */
  public isReadyForProjectCreation(requirements: Partial<ComprehensiveProjectRequirements>): boolean {
    return this.requiredFields.every(field => 
      requirements[field as keyof ComprehensiveProjectRequirements]
    );
  }

  // Private helper methods

  private extractFromNumberedList(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Extract numbered list items (1-9)
    const lines = message.split('\n');
    const numberedItems: { [key: number]: string } = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Match lines that start with a number and a period/dot
      const match = trimmedLine.match(/^(\d+)\.?\s*(.+)$/);
      if (match) {
        const itemNumber = parseInt(match[1]);
        let content = match[2].trim();
        // Remove surrounding quotes if present
        content = content.replace(/^["'](.*)["']$/, '$1');
        if (itemNumber >= 1 && itemNumber <= 9 && content.length > 0) {
          numberedItems[itemNumber] = content;
        }
      }
    }

    // Map numbered items to fields based on our expected order
    // Fix: Add mapping for items 1 and 2 which were missing
    if (numberedItems[1] && !extractedData.userEmail) {
      // Validate email format
      if (this.fieldExtractionConfigs.userEmail.validator?.(numberedItems[1])) {
        extractedData.userEmail = numberedItems[1];
        confidence.userEmail = 95;
      }
    }
    if (numberedItems[2] && !extractedData.reportFrequency) {
      // Clean and validate frequency
      const cleanedFrequency = this.fieldExtractionConfigs.reportFrequency.cleaner?.(numberedItems[2]) || numberedItems[2];
      extractedData.reportFrequency = cleanedFrequency;
      confidence.reportFrequency = 95;
    }
    if (numberedItems[3] && !extractedData.projectName) {
      extractedData.projectName = numberedItems[3];
      confidence.projectName = 90;
    }
    if (numberedItems[4] && !extractedData.productName) {
      extractedData.productName = numberedItems[4];
      confidence.productName = 90;
    }
    if (numberedItems[5] && !extractedData.productUrl) {
      // Validate URL format
      if (this.fieldExtractionConfigs.productUrl.validator?.(numberedItems[5])) {
        extractedData.productUrl = this.fieldExtractionConfigs.productUrl.cleaner?.(numberedItems[5]) || numberedItems[5];
        confidence.productUrl = 95;
      }
    }
    if (numberedItems[6] && !extractedData.industry) {
      extractedData.industry = numberedItems[6];
      confidence.industry = 90;
    }
    if (numberedItems[7] && !extractedData.positioning && numberedItems[7].length >= 10) {
      extractedData.positioning = numberedItems[7];
      confidence.positioning = 90;
    }
    if (numberedItems[8] && !extractedData.customerData && numberedItems[8].length >= 10) {
      extractedData.customerData = numberedItems[8];
      confidence.customerData = 90;
    }
    if (numberedItems[9] && !extractedData.userProblem && numberedItems[9].length >= 10) {
      extractedData.userProblem = numberedItems[9];
      confidence.userProblem = 90;
    }
  }

  private extractField(message: string, fieldName: string): { value: string | null; confidence: number; candidates: string[] } {
    const config = this.fieldExtractionConfigs[fieldName];
    if (!config) return { value: null, confidence: 0, candidates: [] };

    const candidates: string[] = [];
    let bestMatch: string | null = null;
    let maxConfidence = 0;

    // Try each pattern
    for (const pattern of config.patterns) {
      const matches = Array.from(message.matchAll(pattern));
      for (const match of matches) {
        const candidate = match[1] || match[0];
        candidates.push(candidate);

        // Calculate confidence based on context and validation
        let confidence = 70; // Base confidence for pattern match

        // Boost confidence if validation passes
        if (config.validator && config.validator(candidate)) {
          confidence += 25;
        }

        // Boost confidence if found near relevant keywords
        const contextStart = Math.max(0, match.index! - 50);
        const contextEnd = Math.min(message.length, match.index! + candidate.length + 50);
        const context = message.slice(contextStart, contextEnd).toLowerCase();
        
        if (config.keywords.some(keyword => context.includes(keyword))) {
          confidence += 10;
        }

        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = config.cleaner ? config.cleaner(candidate) : candidate;
        }
      }
    }

    // Only return if confidence is above threshold
    if (maxConfidence >= 60) {
      return { value: bestMatch, confidence: maxConfidence, candidates };
    }

    return { value: null, confidence: maxConfidence, candidates };
  }

  private extractProjectName(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const patterns = [
      // Numbered list pattern (3rd item) - more specific
      /(?:^|\n)\s*3\.?\s*([^\n]+?)(?:\n|$)/gm,
      // Quote patterns for project names
      /(?:project|analysis|report)\s+(?:name|title|called?)\s*:?\s*["']([^"'\n]{3,50})["']/gi,
      /(?:call|name)\s+(?:it|this|the\s+project)\s*:?\s*["']([^"'\n]{3,50})["']/gi,
      /["']([^"']{5,50})["']\s*(?:project|analysis|report)/gi,
      // Project: pattern with better matching
      /project\s*:?\s*["']?([^"'\n,]{3,50})["']?/gi,
      // Called pattern
      /called\s+["']?([^"'\n,]{5,50})["']?/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const projectName = match[1].trim().replace(/['"]/g, '');
        if (projectName.length >= 3) {
          extractedData.projectName = projectName;
          confidence.projectName = 85;
          break;
        }
      }
    }
  }

  private extractProductName(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const patterns = [
      // Numbered list pattern (4th item)
      /(?:^|\n)\s*4\.?\s*([^\n]+?)(?:\n|$)/gm,
      // Quote patterns for product names
      /(?:product|company|brand)\s+(?:name|called?)\s*:?\s*["']([^"'\n]{2,30})["']/gi,
      /(?:analyzing|analyze)\s+(?:our\s+)?product\s+["']([^"'\n]{2,30})["']/gi,
      /my\s+(?:product|company|brand)\s+is\s+["']([^"'\n]{2,30})["']/gi,
      // More flexible patterns
      /product\s*:?\s*["']?([^"'\n,]{2,30})["']?/gi,
      /we're\s+analyzing\s+["']?([^"'\n,]{2,30})["']?/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const productName = match[1].trim().replace(/['"]/g, '');
        if (productName.length >= 2) {
          extractedData.productName = productName;
          confidence.productName = 80;
          break;
        }
      }
    }
  }

  private extractIndustry(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const patterns = [
      // Numbered list pattern (6th item) - extract content after the number
      /(?:^|\n)\s*6\.?\s*([^\n]+?)(?:\n|$)/gm,
      // Named patterns
      /(?:industry|sector|market)\s*:?\s*["']?([^"'\n]{3,40})["']?/gi,
      /(?:we're|working)\s+in\s+(?:the\s+)?["']?([^"'\n]{3,40})["']?\s+(?:industry|sector|market)/gi,
      // Direct industry keywords
      /\b(saas|software|fintech|healthcare|retail|food|ecommerce|e-commerce|delivery)\b/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && (match[1] || match[0])) {
        const industry = (match[1] || match[0]).trim().replace(/['"]/g, '');
        if (industry.length >= 3) {
          extractedData.industry = industry;
          confidence.industry = 75;
          break;
        }
      }
    }
  }

  private extractPositioning(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const patterns = [
      // Numbered list pattern (7th item)
      /(?:^|\n)\s*7\.?\s*([^\n]+?)(?:\n|$)/gm,
      // Named patterns
      /(?:positioning|value\s+prop|competitive\s+advantage)\s*:?\s*["']?([^"'\n]{10,200})["']?/gi,
      /(?:we\s+(?:help|provide|offer|specialize))\s+([^.\n]{10,200})/gi,
      /(?:target\s+market|target\s+audience)\s*:?\s*["']?([^"'\n]{10,200})["']?/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const positioning = match[1].trim().replace(/['"]/g, '');
        if (positioning.length >= 10) {
          extractedData.positioning = positioning;
          confidence.positioning = 70;
          break;
        }
      }
    }
  }

  private extractCustomerData(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const patterns = [
      // Numbered list pattern (8th item)
      /(?:^|\n)\s*8\.?\s*([^\n]+?)(?:\n|$)/gm,
      // Named patterns
      /(?:customers?|clients?|users?)\s*:?\s*["']?([^"'\n]{10,200})["']?/gi,
      /(?:demographics|segments?|target\s+audience)\s*:?\s*["']?([^"'\n]{10,200})["']?/gi,
      /(?:\d+[k+]?\s+(?:customers?|clients?|users?))/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const customerData = match[1].trim().replace(/['"]/g, '');
        if (customerData.length >= 10) {
          extractedData.customerData = customerData;
          confidence.customerData = 70;
          break;
        }
      }
    }
  }

  private extractUserProblem(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    const patterns = [
      // Numbered list pattern (9th item)
      /(?:^|\n)\s*9\.?\s*([^\n]+?)(?:\n|$)/gm,
      // Named patterns
      /(?:problem|challenge|issue|pain\s+point)\s*:?\s*["']?([^"'\n]{10,200})["']?/gi,
      /(?:solves?|solving|addresses?)\s+["']?([^"'\n]{10,200})["']?/gi,
      /(?:users?\s+struggle|customers?\s+struggle)\s+(?:with\s+)?["']?([^"'\n]{10,200})["']?/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const userProblem = match[1].trim().replace(/['"]/g, '');
        if (userProblem.length >= 10) {
          extractedData.userProblem = userProblem;
          confidence.userProblem = 70;
          break;
        }
      }
    }
  }

  private extractOptionalFields(message: string, extractedData: Partial<ComprehensiveProjectRequirements>, confidence: { [key: string]: number }) {
    // Extract competitor hints
    const competitorMatch = message.match(/(?:competitors?|compete\s+with)\s*:?\s*["']?([^"'\n]{5,100})["']?/gi);
    if (competitorMatch) {
      const competitorText = competitorMatch[0].replace(/(?:competitors?|compete\s+with)\s*:?\s*/gi, '').trim();
      extractedData.competitorHints = competitorText.split(/[,;&]/).map(c => c.trim()).filter(c => c.length > 2);
      confidence.competitorHints = 65;
    }

    // Extract focus areas
    const focusMatch = message.match(/(?:focus\s+on|analyze|compare)\s*:?\s*["']?([^"'\n]{5,100})["']?/gi);
    if (focusMatch) {
      const focusText = focusMatch[0].replace(/(?:focus\s+on|analyze|compare)\s*:?\s*/gi, '').trim();
      extractedData.focusAreas = focusText.split(/[,;&]/).map(f => f.trim()).filter(f => f.length > 2);
      confidence.focusAreas = 65;
    }
  }

} 