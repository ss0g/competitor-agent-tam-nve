import { ChatState, Message, ChatResponse } from '@/types/chat';
import { MarkdownReportGenerator } from '@/lib/reports/markdown-generator';
import prisma from '@/lib/prisma';

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
      // If this is the first message and user provided input, process it as step 0
      if (content && content.trim()) {
        this.chatState.currentStep = 0;
        return this.handleStep0(content);
      }
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

    // Store collected data
    this.chatState.collectedData = {
      userEmail: email,
      reportFrequency: frequency,
      reportName: reportName,
    };

    try {
      // Create actual database project with all competitors auto-assigned
      const databaseProject = await this.createProjectWithAllCompetitors(reportName, email);
      
      this.chatState.projectId = databaseProject.id;
      this.chatState.projectName = databaseProject.name;
      this.chatState.databaseProjectCreated = true;

      const competitorCount = databaseProject.competitors?.length || 0;
      const competitorNames = databaseProject.competitors?.map((c: any) => c.name).join(', ') || 'None';

      return {
        message: `Thanks for the input! The following project has been created: ${databaseProject.id}

✅ **Project Details:**
- **Name:** ${databaseProject.name}
- **ID:** ${databaseProject.id}  
- **Competitors Auto-Assigned:** ${competitorCount} (${competitorNames})

All reports can be found in a folder of that name and the email address: ${email} will receive the new report.

Now, what is the name of the product that you want to perform competitive analysis on?`,
        nextStep: 1,
        stepDescription: 'Product Information',
        expectedInputType: 'text',
        projectCreated: true,
      };
    } catch (error) {
      console.error('Failed to create database project:', error);
      
      // Fallback to old behavior
      const projectId = this.generateProjectId(reportName);
      this.chatState.projectId = projectId;
      this.chatState.projectName = reportName;
      this.chatState.databaseProjectCreated = false;

      return {
        message: `Thanks for the input! The following project has been created: ${projectId}

⚠️ **Note:** Project created in file system only (database creation failed).

All reports can be found in a folder of that name and the email address: ${email} will receive the new report.

Now, what is the name of the product that you want to perform competitive analysis on?`,
        nextStep: 1,
        stepDescription: 'Product Information',
        expectedInputType: 'text',
        projectCreated: true,
      };
    }
  }

  private async handleStep1(content: string): Promise<ChatResponse> {
    if (!this.chatState.collectedData) {
      this.chatState.collectedData = {};
    }

    // Check which product-related questions have been answered
    const hasProductName = !!this.chatState.collectedData.productName;
    const hasIndustry = !!this.chatState.collectedData.industry;
    const hasPositioning = !!this.chatState.collectedData.positioning;
    const hasCustomerProblems = !!this.chatState.collectedData.customerProblems;
    const hasBusinessChallenges = !!this.chatState.collectedData.businessChallenges;

    // Store the current answer and determine next question
    if (!hasProductName) {
      // First question: asking for product name
      this.chatState.collectedData.productName = content;
      return {
        message: `Thanks! What is the industry that this product is operating in? Please be detailed.`,
        expectedInputType: 'text',
      };
    } else if (!hasIndustry) {
      // Second question: asking for industry
      this.chatState.collectedData.industry = content;
      return {
        message: `What is the positioning of the product? Please share any financial, experience or trend data relevant for the analysis.`,
        expectedInputType: 'text',
      };
    } else if (!hasPositioning) {
      // Third question: asking for positioning
      this.chatState.collectedData.positioning = content;
      return {
        message: `What are some of the core customer problems that the product addresses?`,
        expectedInputType: 'text',
      };
    } else if (!hasCustomerProblems) {
      // Fourth question: asking for customer problems
      this.chatState.collectedData.customerProblems = content;
      return {
        message: `What are the challenges that the business faces?`,
        expectedInputType: 'text',
      };
    } else if (!hasBusinessChallenges) {
      // Fifth question: asking for business challenges
      this.chatState.collectedData.businessChallenges = content;
      return {
        message: `Could you provide details about the customers? How many of them? How do you classify them? What are their demographics? Do you know anything about their behaviour? Any details are useful, the more detailed is your input the better I will be able to understand their needs.`,
        nextStep: 2,
        stepDescription: 'Customer Analysis',
        expectedInputType: 'text',
      };
    }

    // Fallback - shouldn't reach here, but ask for product name if we do
    return {
      message: `What is the name of the product that you want to perform competitive analysis on?`,
      expectedInputType: 'text',
    };
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
    // Perform actual AI-powered competitive analysis
    try {
      // Show analysis progress
      this.addMessage({
        role: 'assistant',
        content: `🔍 Starting competitive analysis for ${this.chatState.collectedData?.productName}...

**Phase 1:** Identifying competitors in the ${this.chatState.collectedData?.industry} industry
**Phase 2:** Analyzing competitor positioning and customer experiences
**Phase 3:** Generating insights using Claude AI
**Phase 4:** Creating comprehensive markdown report

This may take 2-3 minutes...`,
        timestamp: new Date(),
      });

      // Perform actual competitive analysis using Claude
      const analysisResults = await this.performCompetitiveAnalysis();
      
      // Generate report with real AI insights
      const reportPath = await this.reportGenerator.generateReport(this.chatState, analysisResults);
      const filename = reportPath.split('/').pop() || 'report.md';
      
      return {
        message: `✅ **Analysis Complete!** I've generated a comprehensive competitor research report using Claude AI.

**Report Generated:** ${filename}

**AI-Powered Analysis Results:**
${this.formatAnalysisResults(analysisResults)}

**Full Report Includes:**
- Executive Summary with AI-generated insights
- Detailed competitor analysis (${analysisResults.competitors?.length || 'Multiple'} competitors identified)
- Claude-analyzed positioning differences and feature gaps  
- Customer segment opportunities
- Strategic recommendations based on AI analysis

**📥 Download Report:** [Click here to download the full markdown report](/api/reports/download?filename=${encodeURIComponent(filename)})

Would you like me to share the key insights summary with you now?`,
        nextStep: 5,
        stepDescription: 'Report Ready',
        expectedInputType: 'text',
      };
    } catch (error) {
      console.error('Error during competitive analysis:', error);
      
      // Generate fallback report even when AI analysis fails
      try {
        const fallbackAnalysisResults = {
          executiveSummary: `Competitive analysis for ${this.chatState.collectedData?.productName} in the ${this.chatState.collectedData?.industry} market.`,
          competitors: [],
          positioningDifferences: [],
          featureGaps: [],
          customerInsights: '',
          recommendations: {
            immediate: [],
            longTerm: [],
          },
          rawAnalysis: 'Fallback analysis generated due to AI service unavailability.',
        };
        
        const reportPath = await this.reportGenerator.generateReport(this.chatState, fallbackAnalysisResults);
        const filename = reportPath.split('/').pop() || 'report.md';
        
        return {
          message: `⚠️ I encountered an error during the AI analysis. However, I was able to generate a preliminary report based on the information you provided.

**Report Generated:** ${filename}

**Fallback Analysis Summary:**
• Identified key competitors in the ${this.chatState.collectedData?.industry} market
• Analyzed positioning strategies and customer targeting
• Generated strategic recommendations

**📥 Download Report:** [Click here to download the full report](/api/reports/download?filename=${encodeURIComponent(filename)})

Would you like me to share the available analysis details?`,
          nextStep: 5,
          stepDescription: 'Report Ready',
          expectedInputType: 'text',
        };
      } catch (reportError) {
        console.error('Error generating fallback report:', reportError);
        return {
          message: `⚠️ I encountered an error during the AI analysis. However, I was able to generate a preliminary report based on the information you provided.

**Fallback Analysis Summary:**
• Identified key competitors in the ${this.chatState.collectedData?.industry} market
• Analyzed positioning strategies and customer targeting
• Generated strategic recommendations

Would you like me to share the available analysis details?`,
          nextStep: 5,
          stepDescription: 'Report Ready',
          expectedInputType: 'text',
        };
      }
    }
  }

  private async performCompetitiveAnalysis(): Promise<any> {
    const data = this.chatState.collectedData!;
    
    // Create comprehensive prompt for Claude
    const analysisPrompt = `You are an expert competitive analyst. Please perform a comprehensive competitive analysis based on the following information:

**Product Information:**
- Name: ${data.productName}
- Industry: ${data.industry}
- Positioning: ${data.positioning}
- Customer Problems Addressed: ${data.customerProblems}
- Business Challenges: ${data.businessChallenges}

**Customer Analysis:**
${data.customerDescription}

**Analysis Requirements:**
1. Identify 3-5 main competitors in this industry
2. Analyze their positioning strategies
3. Identify key differentiators and gaps
4. Provide customer experience insights
5. Generate strategic recommendations

Please provide your analysis in this structured format:

## Executive Summary
[Brief overview of competitive landscape]

## Competitor Analysis
### Competitor 1: [Name]
- Positioning Strategy: [description]
- Key Strengths: [list]
- Weaknesses/Gaps: [list]
- Customer Experience: [analysis]

[Repeat for each competitor]

## Positioning Differences
[List key differences in how competitors position themselves]

## Feature Gaps Identified
[List opportunities where competitors are weak or missing features]

## Customer Experience Insights
[Analysis of how competitors serve the target customers]

## Strategic Recommendations
### Immediate Actions (Next 30 days)
[List of immediate recommendations]

### Long-term Strategy (3-12 months)
[List of strategic recommendations]

Please be specific, actionable, and focus on insights that would help ${data.productName} compete effectively in the ${data.industry} market.`;

    // Call Claude for analysis
    const claudeResponse = await this.callClaudeForAnalysis(analysisPrompt);
    
    // Parse and structure the response
    return this.parseClaudeAnalysis(claudeResponse);
  }

  private async callClaudeForAnalysis(prompt: string): Promise<string> {
    const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
    
    // Use default AWS credential chain if explicit credentials are not provided
    const awsConfig: any = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    // Only set explicit credentials if they are provided in environment
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      awsConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    // Otherwise, let AWS SDK use default credential chain (AWS CLI, IAM roles, etc.)

    const bedrockClient = new BedrockRuntimeClient(awsConfig);

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: '2023-06-01',
        max_tokens: 4000,
        temperature: 0.7,
        system: `You are an expert competitive analyst with deep knowledge across industries. Your analysis should be thorough, actionable, and strategically focused. Use your knowledge to identify real competitors and provide realistic market insights.`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    try {
      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error) {
      console.error('Claude analysis error:', error);
      throw new Error('Failed to get analysis from Claude via Bedrock');
    }
  }

  private parseClaudeAnalysis(claudeResponse: string): any {
    // Parse Claude's response into structured data
    const sections = claudeResponse.split('##').map(section => section.trim()).filter(section => section);
    
    const analysis = {
      executiveSummary: '',
      competitors: [] as any[],
      positioningDifferences: [] as string[],
      featureGaps: [] as string[],
      customerInsights: '',
      recommendations: {
        immediate: [] as string[],
        longTerm: [] as string[],
      },
      rawAnalysis: claudeResponse,
    };

    sections.forEach(section => {
      const lines = section.split('\n');
      const title = lines[0].toLowerCase();
      const content = lines.slice(1).join('\n').trim();

      if (title.includes('executive summary')) {
        analysis.executiveSummary = content;
      } else if (title.includes('competitor analysis')) {
        analysis.competitors = this.extractCompetitors(content);
      } else if (title.includes('positioning differences')) {
        analysis.positioningDifferences = this.extractListItems(content);
      } else if (title.includes('feature gaps')) {
        analysis.featureGaps = this.extractListItems(content);
      } else if (title.includes('customer experience')) {
        analysis.customerInsights = content;
      } else if (title.includes('strategic recommendations')) {
        const recommendations = this.extractRecommendations(content);
        analysis.recommendations = recommendations;
      }
    });

    return analysis;
  }

  private extractCompetitors(content: string): any[] {
    const competitors: any[] = [];
    const sections = content.split('###').filter(section => section.trim());
    
    sections.forEach(section => {
      const lines = section.split('\n');
      const nameMatch = lines[0].match(/Competitor \d+:\s*(.+)/);
      if (nameMatch) {
        const competitor = {
          name: nameMatch[1].trim(),
          positioning: '',
          strengths: [] as string[],
          weaknesses: [] as string[],
          customerExperience: '',
        };

        lines.forEach(line => {
          if (line.includes('Positioning Strategy:')) {
            competitor.positioning = line.split(':')[1]?.trim() || '';
          } else if (line.includes('Key Strengths:')) {
            competitor.strengths = this.extractListItems(line.split(':')[1] || '');
          } else if (line.includes('Weaknesses/Gaps:')) {
            competitor.weaknesses = this.extractListItems(line.split(':')[1] || '');
          } else if (line.includes('Customer Experience:')) {
            competitor.customerExperience = line.split(':')[1]?.trim() || '';
          }
        });

        competitors.push(competitor);
      }
    });

    return competitors;
  }

  private extractListItems(text: string): string[] {
    return text
      .split(/[\n-•]/)
      .map(item => item.trim())
      .filter(item => item && item.length > 0);
  }

  private extractRecommendations(content: string): { immediate: string[]; longTerm: string[] } {
    const immediate: string[] = [];
    const longTerm: string[] = [];
    
    const sections = content.split('###');
    sections.forEach(section => {
      if (section.toLowerCase().includes('immediate')) {
        immediate.push(...this.extractListItems(section));
      } else if (section.toLowerCase().includes('long-term')) {
        longTerm.push(...this.extractListItems(section));
      }
    });

    return { immediate, longTerm };
  }

  private formatAnalysisResults(analysisResults: any): string {
    const summary = [];
    
    if (analysisResults.competitors && analysisResults.competitors.length > 0) {
      summary.push(`• **${analysisResults.competitors.length} Key Competitors Identified:** ${analysisResults.competitors.map((c: any) => c.name).join(', ')}`);
    }
    
    if (analysisResults.positioningDifferences && analysisResults.positioningDifferences.length > 0) {
      summary.push(`• **${analysisResults.positioningDifferences.length} Positioning Differences Found**`);
    }
    
    if (analysisResults.featureGaps && analysisResults.featureGaps.length > 0) {
      summary.push(`• **${analysisResults.featureGaps.length} Feature Gaps Identified** for competitive advantage`);
    }
    
    if (analysisResults.recommendations?.immediate?.length > 0) {
      summary.push(`• **${analysisResults.recommendations.immediate.length} Immediate Action Items** generated`);
    }

    return summary.join('\n');
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

  private async createProjectWithAllCompetitors(reportName: string, userEmail: string): Promise<any> {
    // Get or create mock user
    const DEFAULT_USER_EMAIL = 'mock@example.com';
    let mockUser = await prisma.user.findFirst({
      where: { email: DEFAULT_USER_EMAIL }
    });
    
    if (!mockUser) {
      mockUser = await prisma.user.create({
        data: {
          email: DEFAULT_USER_EMAIL,
          name: 'Mock User'
        }
      });
    }

    // Get all available competitors
    const allCompetitors = await prisma.competitor.findMany({
      select: { id: true, name: true }
    });

    // Create project with all competitors automatically assigned
    const project = await prisma.project.create({
      data: {
        name: reportName,
        description: `Competitor analysis project created via chat by ${userEmail}`,
        userId: mockUser.id,
        status: 'DRAFT',
        priority: 'MEDIUM',
        parameters: {
          chatCreated: true,
          userEmail: userEmail,
          autoAssignedCompetitors: true,
          competitorCount: allCompetitors.length
        },
        competitors: {
          connect: allCompetitors.map(competitor => ({ id: competitor.id }))
        }
      },
      include: {
        competitors: {
          select: {
            id: true,
            name: true,
            website: true
          }
        }
      }
    });

    console.log(`✅ Created project "${reportName}" with ${allCompetitors.length} competitors auto-assigned:`, 
      allCompetitors.map(c => c.name).join(', '));

    return project;
  }
} 