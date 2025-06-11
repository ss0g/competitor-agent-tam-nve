import { ChatState } from '@/types/chat';

export interface EnhancedChatProjectData {
  userEmail: string;
  frequency: string;
  projectName: string;
  // Enhanced: Product information
  productName?: string | null;
  productWebsite?: string | null;
  industry?: string | null;
  positioning?: string | null;
  customerData?: string | null;
  userProblem?: string | null;
}

export interface ExtractionResult {
  success: boolean;
  data?: EnhancedChatProjectData;
  errors: string[];
  suggestions: string[];
}

export class EnhancedProjectExtractor {
  /**
   * Enhanced project data extraction with intelligent parsing
   * Supports both structured (line-by-line) and unstructured input
   */
  extractProjectData(message: string): ExtractionResult {
    const lines = message.trim().split('\n').filter(line => line.trim());
    
    try {
      // Try structured extraction first (backward compatible)
      const structuredResult = this.tryStructuredExtraction(lines);
      if (structuredResult.success) {
        return structuredResult;
      }
      
      // Fall back to intelligent unstructured extraction
      const unstructuredResult = this.tryUnstructuredExtraction(message);
      return unstructuredResult;
      
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse project information: ${(error as Error).message}`],
        suggestions: [
          'Please provide your information in this format:',
          '1. Email address',
          '2. Report frequency (Weekly/Monthly)', 
          '3. Project name',
          '4. Product website URL',
          '5. Product name (optional)',
          '6. Industry (optional)'
        ]
      };
    }
  }

  /**
   * Backward-compatible structured extraction (line-by-line)
   */
  private tryStructuredExtraction(lines: string[]): ExtractionResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (lines.length < 3) {
      return {
        success: false,
        errors: ['Insufficient information provided'],
        suggestions: [
          'Please provide at least:',
          '• Email address', 
          '• Report frequency (Weekly/Monthly)',
          '• Project name',
          '• Product website URL (highly recommended)'
        ]
      };
    }

    // Check if this looks like structured input (first 3 lines are simple values)
    const firstThreeLines = lines.slice(0, 3);
    const looksStructured = firstThreeLines.length >= 3 && 
      this.extractEmail(firstThreeLines[0]) !== null &&
      this.extractFrequency(firstThreeLines[1]) !== null &&
      firstThreeLines[2].trim().length > 0;

    if (!looksStructured) {
      return { success: false, errors: [], suggestions: [] };
    }

    // Extract core required fields
    const userEmail = this.extractEmail(lines[0]);
    const frequency = this.extractFrequency(lines[1]);
    const projectName = lines[2].trim();

    if (!userEmail) {
      errors.push('Invalid email address format in first line');
      suggestions.push('Email should be in format: user@company.com');
    }

    if (!frequency) {
      errors.push('Invalid frequency in second line');
      suggestions.push('Frequency should be: Weekly, Monthly, or similar');
    }

    if (!projectName || projectName.length < 2) {
      errors.push('Project name too short or missing in third line');
      suggestions.push('Project name should be descriptive (e.g., "Good Chop Analysis")');
    }

    // Extract additional product information from remaining lines
    const productWebsite = this.extractWebsite(lines);
    const productName = this.extractProductName(lines, projectName);
    const industry = this.extractIndustry(lines);
    const positioning = this.extractPositioning(lines);
    const customerData = this.extractCustomerData(lines);
    const userProblem = this.extractUserProblem(lines);

    // Product website is highly recommended but not required for backward compatibility
    if (!productWebsite) {
      suggestions.push('Consider adding your product website URL for better analysis');
    }

    // Return result even with minor issues for backward compatibility
    if (userEmail && frequency && projectName) {
      return {
        success: true,
        data: {
          userEmail,
          frequency,
          projectName,
          productWebsite: productWebsite || undefined,
          productName: productName || undefined,
          industry: industry || undefined,
          positioning: positioning || undefined,
          customerData: customerData || undefined,
          userProblem: userProblem || undefined
        },
        errors,
        suggestions
      };
    }

    return {
      success: false,
      errors,
      suggestions
    };
  }

  /**
   * Intelligent unstructured extraction using pattern matching
   */
  private tryUnstructuredExtraction(message: string): ExtractionResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // Extract email using regex patterns
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const userEmail = emailMatch ? emailMatch[0] : null;

    // Extract frequency using pattern matching
    const frequencyMatch = message.match(/\b(weekly|monthly|daily|quarterly)\b/i);
    const frequency = frequencyMatch ? frequencyMatch[1] : null;

    // Extract project name (look for project/report keywords)
    const projectPatterns = [
      /(?:project|report|analysis)\s*:?\s*"?([^",\n]+)"?/i,
      /(?:name|title)\s*:?\s*"?([^",\n]+)"?/i,
      /(?:call|called)\s+(?:the\s+)?(?:project|report|analysis)\s*:?\s*"?([^",\n]+)"?/i,
      /should be called\s+"([^"]+)"/i
    ];
    
    let projectName = null;
    for (const pattern of projectPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        projectName = match[1].trim().replace(/['"]/g, '');
        break;
      }
    }

    // Extract website URL
    const websiteMatch = message.match(/https?:\/\/[^\s]+/);
    const productWebsite = websiteMatch ? this.validateAndCleanUrl(websiteMatch[0]) : null;

    // Extract product name
    const productPatterns = [
      /^(?:product|company|brand)\s*:?\s*([^,\n]+)/i,
      /(?:analyzing|analyze)\s+([^,\n]+)/i
    ];
    
    let productName = null;
    for (const pattern of productPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        productName = match[1].trim().replace(/['"]/g, '');
        break;
      }
    }

    // Extract industry
    const industryPatterns = [
      /(?:industry|market|sector)\s*:?\s*([^,\n]+)/i,
      /(?:in\s+the)\s+([^,\n\s]+(?:\s+[^,\n\s]+)*?)\s+(?:industry|market|space)/i
    ];
    
    let industry = null;
    for (const pattern of industryPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        industry = match[1].trim().replace(/['"]/g, '');
        break;
      }
    }

    // Validation and error checking
    if (!userEmail) {
      errors.push('Email address not found in message');
      suggestions.push('Please include your email address (e.g., user@company.com)');
    }

    if (!frequency) {
      errors.push('Report frequency not specified');
      suggestions.push('Please specify how often you want reports (e.g., "Weekly" or "Monthly")');
    }

    if (!projectName) {
      errors.push('Project name not identified');
      suggestions.push('Please specify the project name (e.g., "Project: Competitor Analysis")');
    }

    if (!productWebsite) {
      suggestions.push('Consider including your product website URL for better analysis');
    }

    // Return result if we have minimum required information
    if (userEmail && frequency && projectName) {
      return {
        success: true,
        data: {
          userEmail,
          frequency,
          projectName,
          productWebsite: productWebsite || undefined,
          productName: productName || undefined,
          industry: industry || undefined
        },
        errors,
        suggestions
      };
    }

    return {
      success: false,
      errors,
      suggestions: [
        ...suggestions,
        '',
        'Example format:',
        'user@company.com',
        'Weekly',
        'Project: Good Chop Analysis',  
        'https://goodchop.com',
        'Product: Good Chop',
        'Industry: Food Delivery'
      ]
    };
  }

  private extractEmail(line: string): string | null {
    const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    return emailMatch ? emailMatch[0] : null;
  }

  private extractFrequency(line: string): string | null {
    const frequencyPattern = /\b(weekly|monthly|daily|quarterly|biweekly|annually)\b/i;
    const match = line.match(frequencyPattern);
    return match ? match[1] : null;
  }

  private extractWebsite(lines: string[]): string | null {
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        return this.validateAndCleanUrl(urlMatch[0]);
      }
    }
    return null;
  }

  private extractProductName(lines: string[], projectName: string): string | null {
    // Look for explicit product declarations (must start with the keyword)
    for (const line of lines) {
      const productMatch = line.match(/^(?:product|company|brand)\s*:?\s*([^,\n]+)/i);
      if (productMatch) {
        const extracted = productMatch[1].trim().replace(/['"]/g, '');
        // Avoid extracting email domains or URLs
        if (!extracted.includes('@') && !extracted.startsWith('http') && extracted.length > 2) {
          return extracted;
        }
      }
    }
    
    // Extract from project name if it contains recognizable product patterns
    const projectProductMatch = projectName.match(/^(.+?)\s+(?:analysis|research|competitor|vs|comparison)/i);
    if (projectProductMatch) {
      const extracted = projectProductMatch[1].trim();
      // Avoid extracting email domains or URLs
      if (!extracted.includes('@') && !extracted.startsWith('http') && extracted.length > 2) {
        return extracted;
      }
    }
    
    return null;
  }

  private extractIndustry(lines: string[]): string | null {
    for (const line of lines) {
      const industryMatch = line.match(/(?:industry|market|sector)\s*:?\s*([^\n]+)/i);
      if (industryMatch) {
        return industryMatch[1].trim().replace(/['"]/g, '');
      }
    }
    return null;
  }

  private extractPositioning(lines: string[]): string | null {
    for (const line of lines) {
      const positioningMatch = line.match(/(?:positioning|position|value\s+prop)\s*:?\s*([^\n]+)/i);
      if (positioningMatch) {
        return positioningMatch[1].trim().replace(/['"]/g, '');
      }
    }
    return null;
  }

  private extractCustomerData(lines: string[]): string | null {
    for (const line of lines) {
      // Only look for explicit customer data declarations
      const customerMatch = line.match(/(?:customer|client|user)\s*(?:data|info|segment)\s*:?\s*([^,\n]+)/i);
      if (customerMatch) {
        const extracted = customerMatch[1].trim().replace(/['"]/g, '');
        // Avoid extracting email domains as customer data
        if (!extracted.includes('@') && !extracted.startsWith('http') && extracted.length > 3) {
          return extracted;
        }
      }
    }
    return null;
  }

  private extractUserProblem(lines: string[]): string | null {
    for (const line of lines) {
      const problemMatch = line.match(/(?:problem|challenge|pain\s+point|issue)\s*:?\s*([^\n]+)/i);
      if (problemMatch) {
        return problemMatch[1].trim().replace(/['"]/g, '');
      }
    }
    return null;
  }

  private validateAndCleanUrl(url: string): string | null {
    try {
      // Remove trailing punctuation that might not be part of URL
      const cleanUrl = url.replace(/[.,;!?)]+$/, '');
      
      // Handle cases where user provides URL without protocol
      let urlToValidate = cleanUrl;
      if (!urlToValidate.startsWith('http://') && !urlToValidate.startsWith('https://')) {
        urlToValidate = 'https://' + urlToValidate;
      }

      const parsedUrl = new URL(urlToValidate);
      
      // Basic validation
      if (!parsedUrl.hostname || parsedUrl.hostname.length < 3) {
        return null;
      }

      // Ensure protocol is http or https
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return null;
      }

      // Domain should contain at least one dot (except localhost)
      if (!parsedUrl.hostname.includes('.') && 
          !parsedUrl.hostname.startsWith('localhost') && 
          !parsedUrl.hostname.includes(':')) {
        return null;
      }

      return parsedUrl.toString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Create actionable error message for missing information
   */
  createActionableErrorMessage(extractionResult: ExtractionResult): string {
    if (extractionResult.success) {
      return '';
    }

    let message = '⚠️ **Missing Required Information**\n\n';
    
    if (extractionResult.errors.length > 0) {
      message += '**Issues Found:**\n';
      extractionResult.errors.forEach((error, index) => {
        message += `${index + 1}. ${error}\n`;
      });
      message += '\n';
    }

    if (extractionResult.suggestions.length > 0) {
      message += '**Please provide:**\n';
      extractionResult.suggestions.forEach(suggestion => {
        if (suggestion.startsWith('•') || suggestion.startsWith('-')) {
          message += `${suggestion}\n`;
        } else if (suggestion.trim() === '') {
          message += '\n';
        } else {
          message += `• ${suggestion}\n`;
        }
      });
    }

    message += '\n**💡 Tip:** You can provide information in any order or format. I\'ll extract what I need!';

    return message;
  }

  /**
   * Create confirmation message showing extracted data
   */
  createConfirmationMessage(data: EnhancedChatProjectData, suggestions: string[] = []): string {
    let message = '✅ **Project Information Extracted Successfully!**\n\n';
    
    message += `📧 **Email:** ${data.userEmail}\n`;
    message += `📊 **Frequency:** ${data.frequency}\n`;
    message += `📋 **Project:** ${data.projectName}\n`;
    
    if (data.productWebsite) {
      message += `🌐 **Website:** ${data.productWebsite}\n`;
    }
    
    if (data.productName) {
      message += `🏷️ **Product:** ${data.productName}\n`;
    }
    
    if (data.industry) {
      message += `🏭 **Industry:** ${data.industry}\n`;
    }

    if (data.positioning) {
      message += `🎯 **Positioning:** ${data.positioning.substring(0, 100)}${data.positioning.length > 100 ? '...' : ''}\n`;
    }

    if (suggestions.length > 0) {
      message += '\n**💡 Recommendations:**\n';
      suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
    }

    return message;
  }
}

export const enhancedProjectExtractor = new EnhancedProjectExtractor(); 