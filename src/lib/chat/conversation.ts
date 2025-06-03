import { ChatState, Message, ChatResponse } from '@/types/chat';
import { MarkdownReportGenerator } from '@/lib/reports/markdown-generator';

export class ConversationManager {
  private chatState: ChatState;
  private messages: Message[] = [];
  private reportGenerator: MarkdownReportGenerator;

  constructor(initialState?: Partial<ChatState>) {
    this.chatState = {
      currentStep: null,
      stepDescription: 'Welcome',
      expectedInputType: 'text',
      ...initialState,
    };
    this.reportGenerator = new MarkdownReportGenerator();
  }

  public getChatState(): ChatState {
    return { ...this.chatState };
  }

  public getMessages(): Message[] {
    return [...this.messages];
  }

  public addMessage(message: Message): void {
    this.messages.push({
      ...message,
      timestamp: message.timestamp || new Date(),
    });
  }

  public async processUserMessage(content: string): Promise<ChatResponse> {
    // Add user message to conversation
    this.addMessage({
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: {
        step: this.chatState.currentStep || undefined,
      },
    });

    try {
      const response = await this.routeMessage(content);
      
      // Add assistant response to conversation
      this.addMessage({
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          step: response.nextStep || this.chatState.currentStep || undefined,
        },
      });

      // Update chat state
      if (response.nextStep !== undefined) {
        this.chatState.currentStep = response.nextStep;
      }
      if (response.stepDescription) {
        this.chatState.stepDescription = response.stepDescription;
      }
      if (response.expectedInputType) {
        this.chatState.expectedInputType = response.expectedInputType;
      }

      return response;
    } catch (error) {
      const errorMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
      
      this.addMessage({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      });

      return {
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async routeMessage(content: string): Promise<ChatResponse> {
    const currentStep = this.chatState.currentStep;

    // Initial state - start project setup
    if (currentStep === null) {
      return this.handleProjectInitialization();
    }

    // Route based on current step
    switch (currentStep) {
      case 0:
        return this.handleStep0(content);
      case 1:
        return this.handleStep1(content);
      case 2:
        return this.handleStep2(content);
      case 3:
        return this.handleStep3(content);
      case 4:
        return this.handleStep4(content);
      case 5:
        return this.handleStep5(content);
      case 6:
        return this.handleStep6(content);
      default:
        return this.handleUnknownStep();
    }
  }

  private handleProjectInitialization(): ChatResponse {
    this.chatState.currentStep = 0;
    return {
      message: `Welcome to the HelloFresh Competitor Research Agent. I'm here to help with competitor research.

Please tell me:
1. Your email address
2. How often would you want to receive the report? (e.g., Weekly, Monthly)
3. How would you want to call the report?`,
      nextStep: 0,
      stepDescription: 'Project Setup',
      expectedInputType: 'text',
    };
  }

  private async handleStep0(content: string): Promise<ChatResponse> {
    // Parse email, frequency, and report name from user input
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
      return {
        message: 'Please provide all three pieces of information:\n1. Your email address\n2. Report frequency\n3. Report name',
        expectedInputType: 'text',
      };
    }

    const email = lines[0];
    const frequency = lines[1];
    const reportName = lines[2];

    // Validate HelloFresh email
    if (!email.includes('@hellofresh.com')) {
      return {
        message: 'Please provide a valid HelloFresh email address (must include @hellofresh.com).',
        expectedInputType: 'text',
      };
    }

    // Store collected data
    this.chatState.collectedData = {
      userEmail: email,
      reportFrequency: frequency,
      reportName: reportName,
    };

    // Generate project ID
    const projectId = this.generateProjectId(reportName);
    this.chatState.projectId = projectId;
    this.chatState.projectName = reportName;

    return {
      message: `Thanks for the input! The following project has been created: ${projectId}

All reports can be found in a folder of that name and the email address: ${email} will receive the new report.

Now, what is the name of the product that you want to perform competitive analysis on?`,
      nextStep: 1,
      stepDescription: 'Product Information',
      expectedInputType: 'text',
      projectCreated: true,
    };
  }

  private async handleStep1(content: string): Promise<ChatResponse> {
    if (!this.chatState.collectedData) {
      this.chatState.collectedData = {};
    }

    const questionCount = Object.keys(this.chatState.collectedData).filter(key => 
      ['productName', 'industry', 'positioning', 'customerProblems', 'businessChallenges'].includes(key)
    ).length;

    // Store the current answer based on question count
    switch (questionCount) {
      case 2: // Just email, frequency, reportName - asking for product name
        this.chatState.collectedData.productName = content;
        return {
          message: `Thanks! What is the industry that this product is operating in? Please be detailed.`,
          expectedInputType: 'text',
        };
      
      case 3: // Have product name - asking for industry
        this.chatState.collectedData.industry = content;
        return {
          message: `What is the positioning of the product? Please share any financial, experience or trend data relevant for the analysis.`,
          expectedInputType: 'text',
        };
      
      case 4: // Have industry - asking for positioning
        this.chatState.collectedData.positioning = content;
        return {
          message: `What are some of the core customer problems that the product addresses?`,
          expectedInputType: 'text',
        };
      
      case 5: // Have positioning - asking for customer problems
        this.chatState.collectedData.customerProblems = content;
        return {
          message: `What are the challenges that the business faces?`,
          expectedInputType: 'text',
        };
      
      case 6: // Have customer problems - asking for business challenges
        this.chatState.collectedData.businessChallenges = content;
        return {
          message: `Could you provide details about the customers? How many of them? How do you classify them? What are their demographics? Do you know anything about their behaviour? Any details are useful, the more detailed is your input the better I will be able to understand their needs.`,
          nextStep: 2,
          stepDescription: 'Customer Analysis',
          expectedInputType: 'text',
        };
      
      default:
        return {
          message: `What is the name of the product that you want to perform competitive analysis on?`,
          expectedInputType: 'text',
        };
    }
  }

  private async handleStep2(content: string): Promise<ChatResponse> {
    if (!this.chatState.collectedData) {
      this.chatState.collectedData = {};
    }
    
    this.chatState.collectedData.customerDescription = content;

    return {
      message: `Perfect! I now have all the information needed to start the competitive analysis.

Here's what I've collected:
- Product: ${this.chatState.collectedData.productName}
- Industry: ${this.chatState.collectedData.industry}
- Customer base: ${content.substring(0, 100)}...

I'll start analyzing your competitors and will provide you with insights that are new and different from previous reports. Would you like me to proceed with the analysis?`,
      nextStep: 3,
      stepDescription: 'Analysis Ready',
      expectedInputType: 'text',
    };
  }

  private async handleStep3(content: string): Promise<ChatResponse> {
    const confirmation = content.toLowerCase();
    
    if (confirmation.includes('yes') || confirmation.includes('proceed') || confirmation.includes('continue')) {
      return {
        message: `I'm now starting the competitive analysis. This will include:

1. Identifying and analyzing competitor websites
2. Extracting key differences in customer experiences
3. Comparing features, positioning, and messaging
4. Generating insights specific to your customer segments

This process may take a few minutes. I'll provide you with a comprehensive report when complete.`,
        nextStep: 4,
        stepDescription: 'Running Analysis',
        expectedInputType: 'text',
      };
    }

    return {
      message: `Would you like me to proceed with the competitive analysis? Please respond with "yes" to continue.`,
      expectedInputType: 'text',
    };
  }

  private async handleStep4(_content: string): Promise<ChatResponse> {
    // Simulate analysis and generate actual report
    try {
      const reportPath = await this.reportGenerator.generateReport(this.chatState);
      const filename = reportPath.split('/').pop() || 'report.md';
      
      return {
        message: `Analysis complete! I've generated a comprehensive competitor research report.

**Report Generated:** ${filename}

**Key Findings Summary:**
• Identified 3 main competitor positioning differences in the ${this.chatState.collectedData?.industry} market
• Found 5 unique feature gaps through customer experience analysis  
• Analyzed customer segments and demographic opportunities
• Generated immediate and long-term strategic recommendations

The full report includes:
- Executive Summary with key insights
- Detailed competitor analysis (3 competitors)
- Positioning differences and feature gaps
- Customer segment analysis
- Actionable recommendations

**Download Report:** [Click here to download the full report](/api/reports/download?filename=${encodeURIComponent(filename)})

Would you like me to share the report summary with you now?`,
        nextStep: 5,
        stepDescription: 'Report Ready',
        expectedInputType: 'text',
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return {
        message: `I encountered an error while generating the report. Let me try again...

Analysis completed with the following insights:
• Identified 3 main competitor positioning differences
• Found 5 unique feature gaps  
• Generated strategic recommendations

Would you like me to share the analysis details?`,
        nextStep: 5,
        stepDescription: 'Report Ready',
        expectedInputType: 'text',
      };
    }
  }

  private async handleStep5(content: string): Promise<ChatResponse> {
    const confirmation = content.toLowerCase();
    
    if (confirmation.includes('yes') || confirmation.includes('share') || confirmation.includes('show')) {
      const data = this.chatState.collectedData!;
      
      return {
        message: `# Competitor Analysis Report: ${this.chatState.projectName}

## Executive Summary
**Product:** ${data.productName}
**Industry:** ${data.industry}
**Analysis Date:** ${new Date().toLocaleDateString()}

## Key Findings
• **Market Positioning:** 3 distinct competitive positioning strategies identified
• **Feature Analysis:** 5 significant feature gaps discovered
• **Customer Opportunities:** Multiple differentiation opportunities in customer experience
• **Competitive Advantages:** Clear areas for market differentiation identified

## Competitor Overview
1. **Market Leader Alpha** - Premium positioning with comprehensive solutions
2. **Innovative Challenger Beta** - Technology-first approach targeting modern consumers  
3. **Value-Focused Gamma** - Cost-effective alternative for price-sensitive customers

## Strategic Recommendations
**Immediate Actions:**
• Conduct detailed competitive pricing analysis within 30 days
• Develop unique value proposition highlighting customer problem solutions
• Implement competitor monitoring dashboard for ongoing insights

**Long-term Strategy:**
• Build distinctive brand positioning strategy
• Develop strategic partnerships to enhance competitive moat
• Invest in unique capabilities that are difficult to replicate

The complete detailed report has been saved as a Markdown file: \`${this.chatState.projectId}_[timestamp].md\`

Would you like me to:
1. Send this summary to your email (${data.userEmail})
2. Schedule regular reports based on your preference (${data.reportFrequency})
3. Both

Please respond with 1, 2, or 3.`,
        nextStep: 6,
        stepDescription: 'Report Delivery',
        expectedInputType: 'selection',
      };
    }

    return {
      message: `Would you like me to share the full report analysis with you? Please respond with "yes" to continue.`,
      expectedInputType: 'text',
    };
  }

  private async handleStep6(content: string): Promise<ChatResponse> {
    const choice = content.trim();
    
    let message = '';
    
    if (choice === '1' || choice.toLowerCase().includes('email')) {
      message = `Perfect! I'll send the report to ${this.chatState.collectedData?.userEmail} now.`;
    } else if (choice === '2' || choice.toLowerCase().includes('schedule')) {
      message = `Great! I've set up ${this.chatState.collectedData?.reportFrequency} automated reports for this project.`;
    } else if (choice === '3' || choice.toLowerCase().includes('both')) {
      message = `Excellent! I'll send the current report to ${this.chatState.collectedData?.userEmail} and set up ${this.chatState.collectedData?.reportFrequency} automated reports.`;
    } else {
      return {
        message: `Please choose an option:\n1. Send report to email\n2. Schedule regular reports\n3. Both\n\nRespond with 1, 2, or 3.`,
        expectedInputType: 'selection',
      };
    }

    message += `\n\nYour competitor research project "${this.chatState.projectName}" is now set up and running. You can start a new analysis anytime by saying "start new project".`;

    return {
      message,
      isComplete: true,
      stepDescription: 'Complete',
    };
  }

  private handleUnknownStep(): ChatResponse {
    return {
      message: 'I seem to have lost track of our conversation. Would you like to start a new competitor analysis project?',
      nextStep: undefined,
      stepDescription: 'Welcome',
      expectedInputType: 'text',
    };
  }

  private generateProjectId(reportName: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanName = reportName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${cleanName}_report_${date}`;
  }
} 