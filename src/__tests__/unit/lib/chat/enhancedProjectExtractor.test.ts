import { enhancedProjectExtractor } from '../../../../lib/chat/enhancedProjectExtractor';

describe('EnhancedProjectExtractor', () => {
  describe('Structured Input (Backward Compatible)', () => {
    it('should extract basic project information from structured input', () => {
      const message = `
        user@company.com
        Weekly
        Good Chop Analysis
        https://goodchop.com
        Product: Good Chop
        Industry: Food Delivery
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userEmail: 'user@company.com',
        frequency: 'Weekly',
        projectName: 'Good Chop Analysis',
        productWebsite: 'https://goodchop.com',
        productName: 'Good Chop',
        industry: 'Food Delivery',
        positioning: undefined,
        customerData: undefined,
        userProblem: undefined
      });
      expect(result.errors).toEqual([]);
    });

    it('should handle missing product website gracefully', () => {
      const message = `
        user@company.com
        Monthly
        Analysis Project
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(true);
      expect(result.data?.productWebsite).toBeUndefined();
      expect(result.suggestions).toContain('Consider including your product website URL for better analysis');
    });

    it('should fail with insufficient information', () => {
      const message = `
        user@company.com
        Weekly
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Project name too short or missing in third line');
    });

    it('should validate email format', () => {
      const message = `
        invalid-email
        Weekly
        Test Project
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address format in first line');
    });

    it('should validate frequency format', () => {
      const message = `
        user@company.com
        InvalidFrequency
        Test Project
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid frequency in second line');
    });
  });

  describe('Unstructured Input (Intelligent Parsing)', () => {
    it('should extract information from natural language input', () => {
      const message = `
        Hi, I'd like to create a competitive analysis project.
        My email is john@startup.com and I want weekly reports.
        The project should be called "Startup Competitive Analysis".
        Our product website is https://mystartup.com
        We're a SaaS company in the productivity space.
        Product: MyStartup Tool
      `;

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(true);
      expect(result.data?.userEmail).toBe('john@startup.com');
      expect(result.data?.frequency).toBe('weekly');
      expect(result.data?.projectName).toBe('Startup Competitive Analysis');
      expect(result.data?.productWebsite).toBe('https://mystartup.com');
      expect(result.data?.productName).toBe('MyStartup Tool');
    });

    it('should handle mixed format input', () => {
      const message = `
        Email: sarah@foodtech.com
        I need monthly competitive reports
        Project name: Food Delivery Analysis
        Our website: https://fooddelivery.app
        Industry: Food Technology
      `;

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(true);
      expect(result.data?.userEmail).toBe('sarah@foodtech.com');
      expect(result.data?.frequency).toBe('monthly');
      expect(result.data?.projectName).toBe('Food Delivery Analysis');
      expect(result.data?.productWebsite).toBe('https://fooddelivery.app');
      expect(result.data?.industry).toBe('Food Technology');
    });

    it('should fail gracefully with missing required information', () => {
      const message = `
        I want to analyze competitors but I don't have all the details yet.
      `;

      const result = enhancedProjectExtractor.extractProjectData(message);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Email address not found in message');
      expect(result.errors).toContain('Report frequency not specified');
      expect(result.errors).toContain('Project name not identified');
    });
  });

  describe('URL Validation', () => {
    it('should validate and clean URLs correctly', () => {
      const testCases = [
        { input: 'https://example.com', expected: 'https://example.com/' },
        { input: 'http://test.com', expected: 'http://test.com/' },
        { input: 'example.com', expected: 'https://example.com/' },
        { input: 'www.example.com', expected: 'https://www.example.com/' },
        { input: 'https://example.com/path', expected: 'https://example.com/path' },
        { input: 'https://example.com.', expected: 'https://example.com/' }, // trailing period removed
      ];

      testCases.forEach(({ input, expected }) => {
        const message = `
          user@test.com
          Weekly
          Test Project
          ${input}
        `.trim();

        const result = enhancedProjectExtractor.extractProjectData(message);
        expect(result.success).toBe(true);
        expect(result.data?.productWebsite).toBe(expected);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'mailto:test@example.com',
        'javascript:alert(1)',
        'http://',
        'https://',
        ''
      ];

      invalidUrls.forEach(url => {
        const message = `
          user@test.com
          Weekly
          Test Project
          ${url}
        `.trim();

        const result = enhancedProjectExtractor.extractProjectData(message);
        expect(result.data?.productWebsite).toBeUndefined();
      });
    });
  });

  describe('Error Messages', () => {
    it('should create actionable error messages', () => {
      const message = `
        invalid-email
        InvalidFrequency
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);
      const errorMessage = enhancedProjectExtractor.createActionableErrorMessage(result);

      expect(errorMessage).toContain('Missing Required Information');
      expect(errorMessage).toContain('Issues Found:');
      expect(errorMessage).toContain('Please provide:');
      expect(errorMessage).toContain('💡 Tip:');
    });

    it('should return empty string for successful extractions', () => {
      const message = `
        user@company.com
        Weekly
        Test Project
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);
      const errorMessage = enhancedProjectExtractor.createActionableErrorMessage(result);

      expect(errorMessage).toBe('');
    });
  });

  describe('Confirmation Messages', () => {
    it('should create comprehensive confirmation messages', () => {
      const data = {
        userEmail: 'user@company.com',
        frequency: 'Weekly',
        projectName: 'Test Project',
        productWebsite: 'https://example.com',
        productName: 'Test Product',
        industry: 'Technology'
      };

      const confirmationMessage = enhancedProjectExtractor.createConfirmationMessage(data);

      expect(confirmationMessage).toContain('Project Information Extracted Successfully');
      expect(confirmationMessage).toContain('📧 **Email:** user@company.com');
      expect(confirmationMessage).toContain('📊 **Frequency:** Weekly');
      expect(confirmationMessage).toContain('📋 **Project:** Test Project');
      expect(confirmationMessage).toContain('🌐 **Website:** https://example.com');
      expect(confirmationMessage).toContain('🏷️ **Product:** Test Product');
      expect(confirmationMessage).toContain('🏭 **Industry:** Technology');
    });

    it('should include suggestions when provided', () => {
      const data = {
        userEmail: 'user@company.com',
        frequency: 'Weekly',
        projectName: 'Test Project'
      };

      const suggestions = ['Consider adding product website', 'Specify industry for better analysis'];
      const confirmationMessage = enhancedProjectExtractor.createConfirmationMessage(data, suggestions);

      expect(confirmationMessage).toContain('💡 Recommendations:');
      expect(confirmationMessage).toContain('• Consider adding product website');
      expect(confirmationMessage).toContain('• Specify industry for better analysis');
    });
  });

  describe('Product Name Extraction', () => {
    it('should extract product name from project name patterns', () => {
      const testCases = [
        { projectName: 'Good Chop Analysis', expected: 'Good Chop' },
        { projectName: 'Spotify vs Competitors', expected: 'Spotify' },
        { projectName: 'Netflix Competitive Research', expected: 'Netflix' },
        { projectName: 'Uber Comparison Study', expected: 'Uber' }
      ];

      testCases.forEach(({ projectName, expected }) => {
        const message = `
          user@test.com
          Weekly
          ${projectName}
        `.trim();

        const result = enhancedProjectExtractor.extractProjectData(message);
        expect(result.data?.productName).toBe(expected);
      });
    });

    it('should prioritize explicit product declarations', () => {
      const message = `
        user@test.com
        Weekly
        Generic Analysis Project
        Product: Specific Product Name
      `.trim();

      const result = enhancedProjectExtractor.extractProjectData(message);
      expect(result.data?.productName).toBe('Specific Product Name');
    });
  });

  describe('Industry Detection', () => {
    it('should detect industry from various patterns', () => {
      const testCases = [
        { text: 'Industry: Food Technology', expected: 'Food Technology' },
        { text: 'We operate in the fintech market', expected: 'fintech' },
        { text: 'Our sector is healthcare', expected: 'healthcare' }
      ];

      testCases.forEach(({ text, expected }) => {
        const message = `
          user@test.com
          Weekly
          Test Project
          ${text}
        `.trim();

        const result = enhancedProjectExtractor.extractProjectData(message);
        expect(result.data?.industry).toBe(expected);
      });
    });
  });
}); 