import { ComprehensiveRequirementsCollector } from '@/lib/chat/comprehensiveRequirementsCollector';

describe('ComprehensiveRequirementsCollector', () => {
  let collector: ComprehensiveRequirementsCollector;

  beforeEach(() => {
    collector = new ComprehensiveRequirementsCollector();
  });

  describe('generateComprehensivePrompt', () => {
    it('should generate a comprehensive prompt with all required sections', () => {
      const prompt = collector.generateComprehensivePrompt();
      
      expect(prompt).toContain('Welcome to the Competitor Research Agent');
      expect(prompt).toContain('CONTACT & SCHEDULING');
      expect(prompt).toContain('PRODUCT INFORMATION');
      expect(prompt).toContain('BUSINESS CONTEXT');
      expect(prompt).toContain('OPTIONAL ENHANCEMENTS');
      expect(prompt).toContain('HOW TO RESPOND');
      expect(prompt).toContain('Ready when you are');
    });

    it('should support different tones', () => {
      const professionalPrompt = collector.generateComprehensivePrompt({ tone: 'professional' });
      const friendlyPrompt = collector.generateComprehensivePrompt({ tone: 'friendly' });
      const concisePrompt = collector.generateComprehensivePrompt({ tone: 'concise' });

      expect(professionalPrompt).toContain('Competitor Research Agent');
      expect(professionalPrompt).toContain('competitive analysis');
      expect(professionalPrompt).not.toContain('🚀');

      expect(friendlyPrompt).toContain('🚀');
      expect(friendlyPrompt).toContain('Ready when you are! 🎉');

      expect(concisePrompt).toContain('Competitor Analysis Setup');
      expect(concisePrompt).toContain('Ready for your input');
      expect(concisePrompt).not.toContain('OPTIONAL ENHANCEMENTS');
    });

    it('should include industry-specific examples when requested', () => {
      const saasPrompt = collector.generateComprehensivePrompt({ 
        includeExamples: true, 
        industry: 'SaaS' 
      });
      const foodPrompt = collector.generateComprehensivePrompt({ 
        includeExamples: true, 
        industry: 'food' 
      });

      expect(saasPrompt).toContain('SaaS');
      expect(saasPrompt).toContain('B2B productivity platform');
      
      expect(foodPrompt).toContain('meal delivery');
      expect(foodPrompt).toContain('health-conscious');
    });

    it('should hide optional fields when requested', () => {
      const withOptional = collector.generateComprehensivePrompt({ showOptionalFields: true });
      const withoutOptional = collector.generateComprehensivePrompt({ showOptionalFields: false });

      expect(withOptional).toContain('OPTIONAL ENHANCEMENTS');
      expect(withoutOptional).not.toContain('OPTIONAL ENHANCEMENTS');
    });

    it('should customize contextual help', () => {
      const withHelp = collector.generateComprehensivePrompt({ includeContextualHelp: true });
      const withoutHelp = collector.generateComprehensivePrompt({ includeContextualHelp: false });

      expect(withHelp).toContain('intelligently parse');
      expect(withoutHelp).not.toContain('intelligently parse');
    });

    it('should emphasize speed when requested', () => {
      const withSpeed = collector.generateComprehensivePrompt({ emphasizeSpeed: true });
      const withoutSpeed = collector.generateComprehensivePrompt({ emphasizeSpeed: false });

      expect(withSpeed).toContain('faster');
      expect(withoutSpeed).not.toContain('faster');
    });
  });

  describe('generateIndustrySpecificPrompt', () => {
    it('should generate industry-specific prompts', () => {
      const saasPrompt = collector.generateIndustrySpecificPrompt('SaaS');
      const fintech = collector.generateIndustrySpecificPrompt('fintech');

      expect(saasPrompt).toContain('SaaS');
      expect(saasPrompt).toContain('B2B productivity platform');
      
      expect(fintech).toContain('fintech');
      expect(fintech).toContain('freelancers');
    });
  });

  describe('generateConcisePrompt', () => {
    it('should generate a concise prompt', () => {
      const prompt = collector.generateConcisePrompt();
      
      expect(prompt).toContain('Competitor Analysis Setup');
      expect(prompt).not.toContain('OPTIONAL ENHANCEMENTS');
      expect(prompt).not.toContain('🚀');
      expect(prompt).toContain('Ready for your input');
    });
  });

  describe('generatePartialPrompt', () => {
    it('should generate helpful partial prompts', () => {
      const missingFields = ['productUrl', 'industry'];
      const existingData = {
        userEmail: 'test@company.com',
        reportFrequency: 'Weekly',
        projectName: 'Test Project'
      };

      const prompt = collector.generatePartialPrompt(missingFields, existingData);
      
      expect(prompt).toContain('Almost Complete');
      expect(prompt).toContain('7/9 required fields');
      expect(prompt).toContain('Product Website');
      expect(prompt).toContain('Industry/Market');
      expect(prompt).toContain('Already have');
      expect(prompt).toContain('test@company.com');
      expect(prompt).toContain('Weekly');
      expect(prompt).toContain('Test Project');
    });

    it('should handle empty existing data', () => {
      const missingFields = ['userEmail', 'reportFrequency'];
      const existingData = {};

      const prompt = collector.generatePartialPrompt(missingFields, existingData);
      
      expect(prompt).toContain('Almost Complete');
      expect(prompt).toContain('7/9 required fields');
      expect(prompt).toContain('No information collected yet');
    });
  });

  describe('Field Extraction', () => {
    describe('Email extraction', () => {
      it('should extract email from various formats', () => {
        const testCases = [
          'john.doe@company.com',
          '1. john.doe@company.com 2. Weekly 3. Project Name',
          'Email: john.doe@company.com, Frequency: Monthly',
          'Contact me at sarah.johnson@startup.io for updates'
        ];

        testCases.forEach(input => {
          const result = collector.parseComprehensiveInput(input);
          expect(result.extractedData.userEmail).toBeDefined();
          expect(result.extractedData.userEmail).toMatch(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/);
          expect(result.confidence.userEmail).toBeGreaterThan(60);
        });
      });

      it('should handle invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          'test@',
          '@company.com',
          'test@company'
        ];

        invalidEmails.forEach(email => {
          const result = collector.parseComprehensiveInput(email);
          expect(result.extractedData.userEmail).toBeUndefined();
        });
      });
    });

    describe('Frequency extraction', () => {
      it('should extract frequency keywords', () => {
        const testCases = [
          { input: 'weekly reports', expected: 'Weekly' },
          { input: 'every month', expected: 'Monthly' },
          { input: 'quarterly analysis', expected: 'Quarterly' },
          { input: 'bi-weekly updates', expected: 'Weekly' },
          { input: 'I want monthly frequency', expected: 'Monthly' }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = collector.parseComprehensiveInput(input);
          expect(result.extractedData.reportFrequency).toBe(expected);
        });
      });
    });

    describe('URL extraction', () => {
      it('should extract URLs with cleanup', () => {
        const testCases = [
          { input: 'https://example.com', expected: 'https://example.com' },
          { input: 'Website: https://example.com/', expected: 'https://example.com' },
          { input: 'Check out https://example.com?ref=test', expected: 'https://example.com' },
          { input: 'Visit http://test-site.com/page', expected: 'http://test-site.com/page' }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = collector.parseComprehensiveInput(input);
          expect(result.extractedData.productUrl).toBe(expected);
        });
      });
    });

    describe('Project name extraction', () => {
      it('should extract project names from various formats', () => {
        const testCases = [
          'Project name: "Good Chop Analysis"',
          'Call this project "Competitor Research 2024"',
          'Analysis should be called "Market Study"',
          '"Strategic Analysis" project'
        ];

        testCases.forEach(input => {
          const result = collector.parseComprehensiveInput(input);
          expect(result.extractedData.projectName).toBeDefined();
          expect(result.extractedData.projectName!.length).toBeGreaterThan(3);
        });
      });
    });
  });

  describe('Comprehensive parsing', () => {
    it('should handle complete single submission', () => {
      const completeInput = `
        1. john.doe@company.com
        2. Weekly
        3. Good Chop Analysis
        4. Good Chop
        5. https://goodchop.com
        6. Food delivery
        7. Premium meat delivery service targeting health-conscious consumers
        8. 10,000+ customers across urban markets
        9. Finding high-quality, ethically sourced meat
      `;

      const result = collector.parseComprehensiveInput(completeInput);

      expect(result.isValid).toBe(true);
      expect(result.completeness).toBe(100);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.extractedData.userEmail).toBe('john.doe@company.com');
      expect(result.extractedData.reportFrequency).toBe('Weekly');
      expect(result.extractedData.projectName).toBe('Good Chop Analysis');
      expect(result.extractedData.productName).toBe('Good Chop');
      expect(result.extractedData.productUrl).toBe('https://goodchop.com');
      expect(result.extractedData.industry).toBe('Food delivery');
    });

    it('should handle natural language format', () => {
      const naturalInput = `
        Hi! My email is john@company.com and I'd like weekly reports for my project called "Project Alpha". 
        We're analyzing our product "Product Beta" at https://beta.com. We're in the SaaS industry, 
        positioned as a B2B analytics platform with 500+ enterprise clients. Our main user problem 
        is data visualization challenges.
      `;

      const result = collector.parseComprehensiveInput(naturalInput);

      expect(result.extractedData.userEmail).toBe('john@company.com');
      expect(result.extractedData.reportFrequency).toBe('Weekly');
      expect(result.extractedData.projectName).toBe('Project Alpha');
      expect(result.extractedData.productName).toBe('Product Beta');
      expect(result.extractedData.productUrl).toBe('https://beta.com');
      expect(result.extractedData.industry).toBe('SaaS');
      expect(result.completeness).toBeGreaterThan(70);
    });

    it('should handle partial submission gracefully', () => {
      const partialInput = `
        Email: john.doe@company.com
        Frequency: Weekly
        Project: Good Chop Analysis
      `;

      const result = collector.parseComprehensiveInput(partialInput);

      expect(result.isValid).toBe(false);
      expect(result.completeness).toBeLessThan(100);
      expect(result.missingRequiredFields.length).toBeGreaterThan(0);
      expect(result.extractedData.userEmail).toBe('john.doe@company.com');
      expect(result.extractedData.reportFrequency).toBe('Weekly');
      expect(result.extractedData.projectName).toBe('Good Chop Analysis');
    });
  });

  describe('Validation', () => {
    it('should validate complete requirements', () => {
      const completeData = {
        userEmail: 'test@company.com',
        reportFrequency: 'Weekly',
        projectName: 'Test Project',
        productName: 'Test Product',
        productUrl: 'https://test.com',
        industry: 'SaaS',
        positioning: 'B2B software solution',
        customerData: '500+ enterprise customers',
        userProblem: 'Manual data processing'
      };

      const isReady = collector.isReadyForProjectCreation(completeData);
      expect(isReady).toBe(true);
    });

    it('should identify missing required fields', () => {
      const incompleteData = {
        userEmail: 'test@company.com',
        reportFrequency: 'Weekly'
        // Missing other required fields
      };

      const isReady = collector.isReadyForProjectCreation(incompleteData);
      expect(isReady).toBe(false);
    });
  });

  describe('Error handling and suggestions', () => {
    it('should provide specific guidance for invalid email', () => {
      const input = 'invalid-email, Weekly, Project Name';
      const result = collector.parseComprehensiveInput(input);

      expect(result.invalidFields).toContainEqual(
        expect.objectContaining({
          field: 'userEmail',
          reason: expect.stringContaining('Invalid email format')
        })
      );
    });

    it('should handle missing URL gracefully', () => {
      const input = 'john@company.com, Weekly, Project Name, Product Name';
      const result = collector.parseComprehensiveInput(input);

      expect(result.missingRequiredFields).toContain('productUrl');
      expect(result.suggestions.some(s => s.includes('product website URL'))).toBe(true);
    });
  });

  describe('createMissingFieldsPrompt', () => {
    it('should create helpful prompt for missing fields', () => {
      const validationResult = {
        isValid: false,
        completeness: 50,
        missingRequiredFields: ['productUrl', 'industry'],
        invalidFields: [],
        extractedData: {},
        confidence: {},
        suggestions: ['Include your product website URL']
      };

      const prompt = collector.createMissingFieldsPrompt(validationResult);

      expect(prompt).toContain('Progress: 50% Complete');
      expect(prompt).toContain('Still need the following');
      expect(prompt).toContain('Product Website');
      expect(prompt).toContain('Industry/Market');
      expect(prompt).toContain('Helpful tips');
    });
  });

  describe('Data conversion', () => {
    it('should convert comprehensive requirements to chat state', () => {
      const requirements = {
        userEmail: 'test@company.com',
        reportFrequency: 'Weekly',
        projectName: 'Test Project',
        productName: 'Test Product',
        productUrl: 'https://test.com',
        industry: 'SaaS',
        positioning: 'B2B software solution',
        customerData: '500+ enterprise customers',
        userProblem: 'Manual data processing'
      };

      const chatState = collector.toChatState(requirements);

      expect(chatState.collectedData?.userEmail).toBe('test@company.com');
      expect(chatState.collectedData?.reportFrequency).toBe('Weekly');
      expect(chatState.collectedData?.reportName).toBe('Test Project');
      expect(chatState.collectedData?.productName).toBe('Test Product');
      expect(chatState.collectedData?.productUrl).toBe('https://test.com');
      expect(chatState.collectedData?.industry).toBe('SaaS');
      expect(chatState.collectedData?.positioning).toBe('B2B software solution');
      expect(chatState.collectedData?.customerData).toBe('500+ enterprise customers');
      expect(chatState.collectedData?.userProblem).toBe('Manual data processing');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in project names', () => {
      const input = `
        john@company.com
        Weekly
        "Project Alpha & Beta (2024)"
        Product with émojis 🚀
        https://example.com/path?param=value
      `;

      const result = collector.parseComprehensiveInput(input);
      expect(result.extractedData.projectName).toBe('Project Alpha & Beta (2024)');
    });

    it('should handle multiple URLs in text', () => {
      const input = `
        Check out https://main-site.com and also https://backup-site.com
        Email: john@company.com
        Frequency: Monthly
      `;

      const result = collector.parseComprehensiveInput(input);
      expect(result.extractedData.productUrl).toBe('https://main-site.com');
    });

    it('should handle empty input gracefully', () => {
      const result = collector.parseComprehensiveInput('');
      
      expect(result.isValid).toBe(false);
      expect(result.completeness).toBe(0);
      expect(result.missingRequiredFields).toHaveLength(9);
    });

    it('should handle very long input', () => {
      const longInput = 'a'.repeat(5000) + ' john@company.com Weekly Project';
      const result = collector.parseComprehensiveInput(longInput);
      
      expect(result.extractedData.userEmail).toBe('john@company.com');
      expect(result.extractedData.reportFrequency).toBe('Weekly');
    });
  });

  describe('Performance', () => {
    it('should parse typical input within reasonable time', () => {
      const typicalInput = `
        Email: john.doe@company.com
        Frequency: Weekly
        Project: Good Chop Competitive Analysis
        Product: Good Chop
        Website: https://goodchop.com
        Industry: Food delivery and meal kits
        Positioning: Premium meat delivery service targeting health-conscious consumers
        Customers: 10,000+ active subscribers across major urban markets
        Problem: Difficulty finding high-quality, ethically sourced meat
      `;

      const startTime = Date.now();
      const result = collector.parseComprehensiveInput(typicalInput);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(result.completeness).toBeGreaterThan(90);
    });
  });

  describe('Phase 2.2 Advanced Parsing Features', () => {
    describe('Parsing Strategy Detection', () => {
      it('should detect numbered list format', () => {
        const input = `1. test@company.com
        2. Weekly  
        3. Test Project`;
        
        const result = collector.parseComprehensiveInput(input);
        
        // Should use numbered list strategy (indicated by high confidence)
        expect(result.confidence.userEmail).toBeGreaterThan(80);
        expect(result.suggestions.some(s => s.includes('Great format'))).toBe(true);
      });

      it('should detect bullet point format', () => {
        const input = `• test@company.com
        • Weekly reports
        • Test Project`;
        
        const result = collector.parseComprehensiveInput(input);
        
        // Should extract basic fields
        expect(result.extractedData.userEmail).toBe('test@company.com');
        expect(result.suggestions.some(s => s.includes('Nice format'))).toBe(true);
      });

      it('should detect natural language format', () => {
        const input = `Hi! My email is test@company.com and I need weekly reports. 
        The project is called "Test Analysis" and we're in the SaaS industry. 
        Our product is called "TestApp" and it's at https://testapp.com.`;
        
        const result = collector.parseComprehensiveInput(input);
        
        // Should extract some fields and suggest numbered format
        expect(result.extractedData.userEmail).toBe('test@company.com');
        expect(result.suggestions.some(s => s.includes('numbered list format'))).toBe(true);
      });

      it('should handle mixed format intelligently', () => {
        const input = `Email: test@company.com
        I want monthly reports
        1. Project name: Test Project
        URL: https://test.com`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.extractedData.userEmail).toBe('test@company.com');
        expect(result.extractedData.reportFrequency).toBe('Monthly');
        expect(result.extractedData.productUrl).toBe('https://test.com');
      });
    });

    describe('Input Preprocessing', () => {
      it('should normalize various input formats', () => {
        const input = `1.  test@company.com   
        2.   Weekly   
        3.  "Test Project"  `;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.extractedData.userEmail).toBe('test@company.com');
        expect(result.extractedData.reportFrequency).toBe('Weekly');
        expect(result.extractedData.projectName).toBe('Test Project');
      });

      it('should handle special characters and Unicode', () => {
        const input = `1. test@company.com
        2. Weekly
        3. "Prøject Análysis"`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.extractedData.projectName).toBeTruthy();
      });
    });

    describe('Contextual Intelligence', () => {
      it('should detect industry context from content', () => {
        const input = `We're building a SaaS platform for healthcare providers.
        Email: test@company.com
        Monthly reports please.`;
        
        const result = collector.parseComprehensiveInput(input);
        
        // Should detect both SaaS and Healthcare contexts
        expect(result.extractedData.industry).toBeTruthy();
        expect(['SaaS', 'Healthcare']).toContain(result.extractedData.industry);
      });

      it('should use contextual clues for better extraction', () => {
        const input = `Our fintech startup processes payments for small businesses.
        Contact: john@paytech.com
        Need weekly competitive analysis.`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.extractedData.userEmail).toBe('john@paytech.com');
        expect(result.extractedData.reportFrequency).toBe('Weekly');
        expect(result.extractedData.industry).toBe('FinTech');
      });
    });

    describe('Smart Completeness Calculation', () => {
      it('should weight completeness by confidence scores', () => {
        const input = `1. test@company.com
        2. Weekly
        3. Test Project`;
        
        const result = collector.parseComprehensiveInput(input);
        
        // High confidence fields should contribute more to completeness
        expect(result.completeness).toBeGreaterThan(25); // 3/9 fields = 33%, but weighted by confidence
        expect(result.confidence.userEmail).toBeGreaterThan(80);
      });

      it('should handle partial credit for uncertain extractions', () => {
        const input = `Maybe weekly reports? Email might be test@company.com`;
        
        const result = collector.parseComprehensiveInput(input);
        
        // Should extract with lower confidence
        expect(result.extractedData.userEmail).toBeTruthy();
        expect(result.confidence.userEmail).toBeLessThan(100);
      });
    });

    describe('Intelligent Suggestion Generation', () => {
      it('should provide format-specific suggestions', () => {
        const numberedInput = `1. test@company.com
        2. Weekly`;
        
        const result = collector.parseComprehensiveInput(numberedInput);
        
        expect(result.suggestions.some(s => s.includes('Great format'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('Continue using numbered list'))).toBe(true);
      });

      it('should suggest optimal format for mixed inputs', () => {
        const mixedInput = `Email: test@company.com, need reports weekly`;
        
        const result = collector.parseComprehensiveInput(mixedInput);
        
        expect(result.suggestions.some(s => s.includes('numbered list'))).toBe(true);
      });

      it('should provide context-aware field suggestions', () => {
        const input = `test@company.com, Weekly`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.suggestions.some(s => s.includes('📧'))).toBe(false); // Email already provided
        expect(result.suggestions.some(s => s.includes('🔗'))).toBe(true);   // URL missing
        expect(result.suggestions.some(s => s.includes('🏢'))).toBe(true);   // Industry missing
      });
    });

    describe('Enhanced Field Validation', () => {
      it('should validate email formats contextually', () => {
        const input = `1. invalid-email-format
        2. Weekly
        3. Test Project`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.invalidFields.some(f => f.field === 'userEmail')).toBe(true);
        expect(result.invalidFields.some(f => f.reason.includes('Invalid email format'))).toBe(true);
      });

      it('should validate URL formats with suggestions', () => {
        const input = `1. test@company.com
        2. Weekly
        3. Test Project
        4. TestApp
        5. invalid-url-format`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.invalidFields.some(f => f.field === 'productUrl')).toBe(true);
        expect(result.invalidFields.some(f => f.suggestion.includes('https://'))).toBe(true);
      });

      it('should validate frequency keywords', () => {
        const input = `1. test@company.com
        2. sometimes
        3. Test Project`;
        
        const result = collector.parseComprehensiveInput(input);
        
        expect(result.invalidFields.some(f => f.field === 'reportFrequency')).toBe(true);
        expect(result.invalidFields.some(f => f.suggestion.includes('Weekly, Monthly, or Quarterly'))).toBe(true);
      });
    });

    describe('Performance Optimization', () => {
      it('should handle large inputs efficiently', () => {
        const largeInput = `1. test@company.com
        2. Weekly
        3. ${'Very '.repeat(100)}Long Project Name
        4. ${'Product '.repeat(50)}Name
        5. https://example.com
        6. ${'SaaS '.repeat(20)}Industry
        7. ${'We provide '.repeat(50)}extensive positioning
        8. ${'Our customers '.repeat(30)}are diverse
        9. ${'The main problem '.repeat(25)}is complexity`;
        
        const startTime = Date.now();
        const result = collector.parseComprehensiveInput(largeInput);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(200); // Should handle large input quickly
        expect(result.extractedData.userEmail).toBe('test@company.com');
        expect(result.extractedData.projectName).toBeTruthy();
      });
    });
  });
}); 