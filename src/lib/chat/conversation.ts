import { ChatState, Message, ChatResponse } from '@/types/chat';
import { MarkdownReportGenerator } from '@/lib/reports/markdown-generator';
import prisma from '@/lib/prisma';
import { parseFrequency, frequencyToString } from '@/utils/frequencyParser';
import { projectScrapingService } from '@/services/projectScrapingService';
import { productChatProcessor } from './productChatProcessor';
import { productService } from '@/services/productService';
import { enhancedProjectExtractor, EnhancedChatProjectData } from './enhancedProjectExtractor';

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
      case 1.5:
        return this.handleStep1_5(content);
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
    // Use enhanced project extractor for intelligent parsing
    const extractionResult = enhancedProjectExtractor.extractProjectData(content);
    
    if (!extractionResult.success) {
      const errorMessage = enhancedProjectExtractor.createActionableErrorMessage(extractionResult);
      return {
        message: errorMessage,
        expectedInputType: 'text',
      };
    }

    const extractedData = extractionResult.data!;

    // Store collected data in enhanced format
    this.chatState.collectedData = {
      userEmail: extractedData.userEmail,
      reportFrequency: extractedData.frequency,
      reportName: extractedData.projectName,
      // Enhanced: Product information
      productName: extractedData.productName || undefined,
      productUrl: extractedData.productWebsite || undefined,
      industry: extractedData.industry || undefined,
      positioning: extractedData.positioning || undefined,
      customerData: extractedData.customerData || undefined,
      userProblem: extractedData.userProblem || undefined,
    };

    // Use enhanced confirmation message for better UX
    const confirmationMessage = enhancedProjectExtractor.createConfirmationMessage(
      extractedData, 
      extractionResult.suggestions
    );

    try {
      // Create actual database project with all competitors auto-assigned
      const databaseProject = await this.createProjectWithAllCompetitors(extractedData.projectName, extractedData.userEmail);
      
      this.chatState.projectId = databaseProject.id;
      this.chatState.projectName = databaseProject.name;
      this.chatState.databaseProjectCreated = true;

      const competitorCount = databaseProject.competitors?.length || 0;
      const competitorNames = databaseProject.competitors?.map((c: any) => c.name).join(', ') || 'None';
      const parsedFreq = parseFrequency(extractedData.frequency);

      return {
        message: `Thanks for the input! The following project has been created: ${databaseProject.id}

✅ **Project Details:**
- **Name:** ${databaseProject.name}
- **ID:** ${databaseProject.id}  
- **Competitors Auto-Assigned:** ${competitorCount} (${competitorNames})
- **Scraping Frequency:** ${frequencyToString(parsedFreq.frequency)} (${parsedFreq.description})

🕕 **Automated Scraping Scheduled:** Your competitors will be automatically scraped ${frequencyToString(parsedFreq.frequency).toLowerCase()} to ensure fresh data for reports.

All reports can be found in a folder of that name and the email address: ${extractedData.userEmail} will receive the new report.

Now, what is the name of the product that you want to perform competitive analysis on?`,
        nextStep: 1,
        stepDescription: 'Product Information',
        expectedInputType: 'text',
        projectCreated: true,
      };
    } catch (error) {
      console.error('Failed to create database project:', error);
      
      // Try to create project without scraping scheduling
      try {
        const databaseProject = await this.createProjectWithoutScraping(extractedData.projectName, extractedData.userEmail);
        
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

⚠️ **Note:** Automated scraping scheduling failed, but project was created successfully in database. You can manually trigger scraping later.

All reports can be found in a folder of that name and the email address: ${extractedData.userEmail} will receive the new report.

Now, what is the name of the product that you want to perform competitive analysis on?`,
          nextStep: 1,
          stepDescription: 'Product Information',
          expectedInputType: 'text',
          projectCreated: true,
        };
      } catch (fallbackError) {
        console.error('Failed to create project even without scraping:', fallbackError);
        
        // Final fallback to file system only
        const projectId = this.generateProjectId(extractedData.projectName);
        this.chatState.projectId = projectId;
        this.chatState.projectName = extractedData.projectName;
        this.chatState.databaseProjectCreated = false;

        return {
          message: `Thanks for the input! The following project has been created: ${projectId}

⚠️ **Note:** Project created in file system only (database creation failed).

All reports can be found in a folder of that name and the email address: ${extractedData.userEmail} will receive the new report.

Now, what is the name of the product that you want to perform competitive analysis on?`,
          nextStep: 1,
          stepDescription: 'Product Information',
          expectedInputType: 'text',
          projectCreated: true,
        };
      }
    }
  }

  private async handleStep1(content: string): Promise<ChatResponse> {
    // Use the enhanced product chat processor for PRODUCT data collection
    const response = await productChatProcessor.collectProductData(content, this.chatState);
    
    // Check if product data collection is complete
    if (productChatProcessor.validateProductData(this.chatState)) {
      // All product data collected, proceed to product creation step
      response.nextStep = 1.5; // Intermediate step for product creation
      response.stepDescription = 'Product Creation';
    }
    
    return response;
  }

  private async handleStep1_5(content: string): Promise<ChatResponse> {
    // Handle product creation confirmation
    const confirmation = content.toLowerCase();
    
    if (confirmation.includes('yes') || confirmation.includes('proceed') || confirmation.includes('continue')) {
      try {
        // Ensure we have a project ID
        if (!this.chatState.projectId) {
          throw new Error('No project ID available for product creation');
        }

        // Create the PRODUCT entity from collected chat data
        const product = await productService.createProductFromChat(this.chatState, this.chatState.projectId);

        return {
          message: `🎉 **PRODUCT Entity Created Successfully!**

✅ **Product Created:** ${product.name}
✅ **Product ID:** ${product.id}
✅ **Website:** ${product.website}
✅ **Project:** ${this.chatState.projectName} (${this.chatState.projectId})

Your PRODUCT is now ready for comparative analysis! The system will:

1. ✅ **PRODUCT Entity** - Created and stored in database
2. 🔄 **Web Scraping** - Will scrape your product website (${product.website})
3. 🔄 **Competitor Analysis** - Will analyze against all project competitors
4. 🔄 **AI Comparison** - Will generate PRODUCT vs COMPETITOR insights
5. 🔄 **Report Generation** - Will create comprehensive comparative report

Ready to start the comparative analysis?`,
          nextStep: 3,
          stepDescription: 'Analysis Ready',
          expectedInputType: 'text',
        };
      } catch (error) {
        console.error('Failed to create PRODUCT entity:', error);
        
        return {
          message: `❌ **Error Creating PRODUCT Entity**

I encountered an error while creating your PRODUCT entity: ${error instanceof Error ? error.message : 'Unknown error'}

Please try again, or we can proceed with the legacy analysis flow. Would you like to:

1. **Retry** - Try creating the PRODUCT entity again
2. **Continue** - Proceed with legacy competitor-only analysis

Please respond with "retry" or "continue".`,
          expectedInputType: 'text',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return {
      message: `Would you like me to proceed with creating the PRODUCT entity and starting the comparative analysis? 

This will create a PRODUCT record in the database with all the information you've provided, then begin scraping and analysis.

Please respond with "yes" to continue.`,
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
    // Generate consolidated comparative report using new API
    try {
      // Show analysis progress
      this.addMessage({
        role: 'assistant',
        content: `🔍 Starting consolidated competitive analysis for ${this.chatState.collectedData?.productName}...

**Phase 1:** Preparing product data and competitor information
**Phase 2:** Running AI-powered comparative analysis across ALL competitors
**Phase 3:** Generating consolidated insights using Claude AI
**Phase 4:** Creating single comprehensive comparative report

This may take 2-3 minutes...`,
        timestamp: new Date(),
      });

      // Ensure we have a project ID
      if (!this.chatState.projectId) {
        throw new Error('No project ID available for comparative report generation');
      }

      // Call the new comparative report API
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3000/api/reports/comparative?projectId=${this.chatState.projectId}`
        : `/api/reports/comparative?projectId=${this.chatState.projectId}`;

      const reportResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportName: `${this.chatState.projectName} - Comparative Analysis`,
          template: 'comprehensive',
          focusArea: 'overall',
          includeRecommendations: true
        })
      });

      const reportResult = await reportResponse.json();

      if (!reportResponse.ok || !reportResult.success) {
        throw new Error(reportResult.error || 'Comparative report generation failed');
      }

      return {
        message: `✅ **Consolidated Comparative Analysis Complete!**

📊 **Report Generated:** ${reportResult.report.title}
🎯 **Competitors Analyzed:** ${reportResult.metadata.competitorCount}
📈 **Analysis Type:** ${reportResult.metadata.template}
🎯 **Focus Area:** ${reportResult.metadata.focusArea}

**🆕 Key Improvement:** Your analysis is now delivered as a **single consolidated report** that compares your product against **ALL competitors simultaneously**, rather than separate individual reports.

**Report Highlights:**
- **Sections:** ${reportResult.report.sections.length} comprehensive analysis sections
- **Executive Summary:** AI-generated strategic overview
- **Competitive Positioning:** Direct comparisons across all competitors
- **Strategic Recommendations:** Actionable insights based on consolidated analysis
- **Market Opportunities:** Gaps identified across the competitive landscape

**📁 Report Location:** Your consolidated comparative report has been saved and is available in the Reports section.

Would you like me to show you the executive summary of your consolidated competitive analysis?`,
        nextStep: 5,
        stepDescription: 'Report Complete',
        expectedInputType: 'text',
      };
    } catch (error) {
      console.error('Error during comparative report generation:', error);
      
      return {
        message: `⚠️ **Report Generation Issue**

I encountered an error while generating your consolidated comparative report: ${(error as Error).message}

**What happened:** The new consolidated reporting system had an issue, but don't worry - your project and data are saved.

**Next steps:**
1. You can try again in a few minutes
2. Check the Reports section to see if any reports were generated
3. Contact support if the issue persists

**Project Details:**
- **Project:** ${this.chatState.projectName}
- **Project ID:** ${this.chatState.projectId}
- **Product:** ${this.chatState.collectedData?.productName}

Would you like me to:
1. **Retry** the consolidated report generation
2. **Continue** to the summary of what we've collected
3. **Start over** with a new project

Please respond with "retry", "continue", or "start over".`,
        nextStep: 5,
        stepDescription: 'Error Recovery',
        expectedInputType: 'text',
        error: (error as Error).message,
      };
    }
  }

  /**
   * @deprecated This method is deprecated in favor of the new consolidated comparative report API.
   * Individual AI analysis is now handled by the /api/reports/comparative endpoint.
   * This method is kept for backward compatibility only.
   */
  private async performCompetitiveAnalysis(): Promise<any> {
    // This method is now deprecated - the comparative report API handles AI analysis
    console.warn('performCompetitiveAnalysis is deprecated - use /api/reports/comparative instead');
    
    const data = this.chatState.collectedData!;
    
    // Return simplified fallback data since analysis is now handled by the API
    return {
      executiveSummary: `Competitive analysis for ${data.productName} in the ${data.industry} market.`,
      competitors: [],
      positioningDifferences: [],
      featureGaps: [],
      customerInsights: '',
      recommendations: {
        immediate: [],
        longTerm: [],
      },
      rawAnalysis: 'Analysis is now handled by the consolidated comparative report API.',
    };
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
    const input = content.toLowerCase().trim();
    
    // Handle error recovery options
    if (input === 'retry') {
      // Retry the comparative report generation
      return await this.handleStep4('');
    }
    
    if (input === 'continue') {
      // Show summary of collected data
      const data = this.chatState.collectedData!;
      
      return {
        message: `📋 **Project Summary**

Here's what we've collected for your competitive analysis:

**Project Details:**
• **Name:** ${this.chatState.projectName}
• **Project ID:** ${this.chatState.projectId}
• **Status:** Active

**Product Information:**
• **Product:** ${data.productName}
• **Industry:** ${data.industry}
• **Positioning:** ${data.positioning || 'Not specified'}
• **Website:** ${data.productUrl || 'Not specified'}

**Analysis Configuration:**
• **Report Frequency:** ${data.reportFrequency}
• **Email Contact:** ${data.userEmail}

Your project is set up and ready. You can:
1. Try generating the comparative report again later
2. Access your project via the Projects page
3. View any existing reports in the Reports section

Thank you for using the Competitor Research Agent!`,
        isComplete: true,
        stepDescription: 'Complete',
      };
    }
    
    if (input === 'start over') {
      // Reset chat state and start fresh
      this.chatState = {
        currentStep: null,
        stepDescription: 'Welcome',
        expectedInputType: 'text',
      };
      this.messages = [];
      
      return this.handleProjectInitialization();
    }
    
    // Handle normal flow - showing executive summary
    if (input.includes('yes') || input.includes('share') || input.includes('show')) {
      // Get the latest comparative report data from the chat state or API
      const data = this.chatState.collectedData!;
      
      return {
        message: `📊 **Consolidated Competitive Analysis Summary**

## Executive Summary
**Product:** ${data.productName}
**Industry:** ${data.industry}
**Analysis Date:** ${new Date().toLocaleDateString()}
**Report Type:** **Consolidated Comparative Analysis** (Single report comparing your product vs ALL competitors)

## Key Findings from Consolidated Analysis
• **Competitive Landscape:** Comprehensive view across all competitors in ${data.industry}
• **Market Positioning:** Strategic positioning analysis comparing your product against the entire competitive field
• **Differentiation Opportunities:** Gaps identified across ALL competitor offerings simultaneously
• **Strategic Advantages:** Areas where your product can outperform the competitive landscape

## Consolidated Report Benefits
✅ **Single Source of Truth:** One comprehensive document instead of multiple separate reports
✅ **Cross-Competitor Insights:** Patterns and opportunities visible only when analyzing all competitors together
✅ **Strategic Overview:** High-level competitive landscape understanding
✅ **Actionable Intelligence:** Recommendations based on full market analysis

## Next Steps
Your consolidated comparative report is available in the **Reports section** and contains:
- Detailed competitive analysis across all competitors
- Strategic recommendations based on market-wide analysis
- Opportunities for differentiation and competitive advantage
- Executive summary and actionable insights

Would you like me to:
1. Send this summary to your email (${data.userEmail})
2. Schedule regular comparative reports (${data.reportFrequency})
3. Both

Please respond with 1, 2, or 3.`,
        nextStep: 6,
        stepDescription: 'Report Delivery',
        expectedInputType: 'selection',
      };
    }

    return {
      message: `Would you like me to show you the executive summary of your consolidated competitive analysis? Please respond with "yes" to continue.`,
      expectedInputType: 'text',
    };
  }

  private async handleStep6(content: string): Promise<ChatResponse> {
    const choice = content.trim();
    
    let message = '';
    
    if (choice === '1' || choice.toLowerCase().includes('email')) {
      message = `Perfect! I'll send the consolidated comparative report to ${this.chatState.collectedData?.userEmail} now.

📧 **Email Summary:**
• **To:** ${this.chatState.collectedData?.userEmail}
• **Subject:** Consolidated Competitive Analysis - ${this.chatState.projectName}
• **Content:** Executive summary + link to full comparative report
• **Delivery:** Within the next few minutes`;
    } else if (choice === '2' || choice.toLowerCase().includes('schedule')) {
      message = `Great! I've set up ${this.chatState.collectedData?.reportFrequency} automated comparative reports for this project.

⏰ **Scheduling Details:**
• **Frequency:** ${this.chatState.collectedData?.reportFrequency}
• **Report Type:** Consolidated comparative analysis (single report per cycle)
• **Delivery:** Email notifications to ${this.chatState.collectedData?.userEmail}
• **Content:** Updated competitive landscape analysis including new competitor insights`;
    } else if (choice === '3' || choice.toLowerCase().includes('both')) {
      message = `Excellent! I'll send the current consolidated comparative report to ${this.chatState.collectedData?.userEmail} and set up ${this.chatState.collectedData?.reportFrequency} automated reports.

📧 **Immediate Email:** Executive summary + report link
⏰ **Ongoing Schedule:** ${this.chatState.collectedData?.reportFrequency} comparative reports
📊 **Benefit:** You'll receive one consolidated report each cycle instead of multiple individual competitor reports`;
    } else {
      return {
        message: `Please choose an option:
1. **Send comparative report to email**
2. **Schedule regular comparative reports**  
3. **Both**

Respond with 1, 2, or 3.`,
        expectedInputType: 'selection',
      };
    }

    message += `\n\n🎉 **Setup Complete!**

Your consolidated competitor research project "${this.chatState.projectName}" is now active with:
• **✅ Project Created:** ${this.chatState.projectId}
• **✅ Consolidated Reporting:** Single comparative report per analysis cycle
• **✅ AI-Powered Analysis:** Claude-driven competitive intelligence
• **✅ Strategic Insights:** Market-wide competitive analysis

**Next Steps:**
• Check the **Reports section** for your comparative analysis
• Visit the **Projects section** to manage your project
• Use the **Chat** anytime to start a new analysis

You can start a new analysis anytime by saying "start new project". Thank you for using the Competitor Research Agent!`;

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

  private async createProjectWithoutScraping(reportName: string, userEmail: string): Promise<any> {
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

    // Parse frequency from collected data
    const frequencyInput = this.chatState.collectedData?.reportFrequency || 'weekly';
    const parsedFrequency = parseFrequency(frequencyInput);

    console.log(`📅 Parsed frequency: "${frequencyInput}" -> ${frequencyToString(parsedFrequency.frequency)}`);
    console.log(`⏰ Cron expression: ${parsedFrequency.cronExpression}`);

    // Create project with all competitors automatically assigned (without scraping scheduling)
    const project = await prisma.project.create({
      data: {
        name: reportName,
        description: `Competitor analysis project created via chat by ${userEmail}`,
        userId: mockUser.id,
        status: 'ACTIVE',
        priority: 'MEDIUM',
        userEmail: userEmail,
        parameters: {
          chatCreated: true,
          userEmail: userEmail,
          autoAssignedCompetitors: true,
          competitorCount: allCompetitors.length,
          scrapingFrequency: parsedFrequency.frequency,
          frequencyDescription: parsedFrequency.description,
          cronExpression: parsedFrequency.cronExpression,
          scrapingSchedulingFailed: true
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

    console.log(`✅ Created project "${reportName}" with ${allCompetitors.length} competitors auto-assigned (no scraping scheduled):`, 
      allCompetitors.map(c => c.name).join(', '));

    return project;
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

    // Parse frequency from collected data
    const frequencyInput = this.chatState.collectedData?.reportFrequency || 'weekly';
    const parsedFrequency = parseFrequency(frequencyInput);

    console.log(`📅 Parsed frequency: "${frequencyInput}" -> ${frequencyToString(parsedFrequency.frequency)}`);
    console.log(`⏰ Cron expression: ${parsedFrequency.cronExpression}`);

    // Create project with all competitors automatically assigned
    const project = await prisma.project.create({
      data: {
        name: reportName,
        description: `Competitor analysis project created via chat by ${userEmail}`,
        userId: mockUser.id,
        status: 'ACTIVE',
        priority: 'MEDIUM',
        scrapingFrequency: parsedFrequency.frequency,
        userEmail: userEmail,
        parameters: {
          chatCreated: true,
          userEmail: userEmail,
          autoAssignedCompetitors: true,
          competitorCount: allCompetitors.length,
          scrapingFrequency: parsedFrequency.frequency,
          frequencyDescription: parsedFrequency.description,
          cronExpression: parsedFrequency.cronExpression
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

    // Set up scraping schedule for the project
    try {
      const jobId = await projectScrapingService.scheduleProjectScraping(project.id);
      if (jobId) {
        console.log(`🕕 Scraping scheduled for project "${reportName}" with frequency: ${frequencyToString(parsedFrequency.frequency)}`);
      } else {
        console.warn(`⚠️ Failed to schedule scraping for project "${reportName}"`);
      }
    } catch (error) {
      console.error(`❌ Error scheduling scraping for project "${reportName}":`, error);
    }

    return project;
  }
} 