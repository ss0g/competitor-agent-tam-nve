import { PrismaClient } from '@prisma/client';
import { ReportGenerator } from './reports';
import * as cronParser from 'cron-parser';
import nodemailer from 'nodemailer';

export interface ScheduleOptions {
  name: string;
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customCron?: string;
  timeframe: number;
  recipients: string[];
  notifyOnChanges?: boolean;
  userId?: string;
}

export class ReportScheduler {
  public prisma: PrismaClient;
  private reportGenerator: ReportGenerator;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.prisma = new PrismaClient();
    this.reportGenerator = new ReportGenerator();
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async getSchedule(scheduleId: string) {
    return this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        report: {
          include: {
            competitor: true,
          },
        },
      },
    });
  }

  async createSchedule(reportId: string, options: ScheduleOptions): Promise<any> {
    const nextRun = this.calculateNextRun(options.frequency, options.customCron);

    return this.prisma.reportSchedule.create({
      data: {
        reportId,
        name: options.name,
        description: options.description,
        frequency: options.frequency,
        customCron: options.customCron,
        timeframe: options.timeframe,
        nextRun,
        recipients: options.recipients,
        notifyOnChanges: options.notifyOnChanges || false,
        createdBy: options.userId,
      },
    });
  }

  async updateSchedule(scheduleId: string, options: Partial<ScheduleOptions>): Promise<any> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const nextRun = options.frequency || options.customCron
      ? this.calculateNextRun(
          options.frequency || schedule.frequency as ScheduleOptions['frequency'],
          options.customCron || schedule.customCron
        )
      : undefined;

    return this.prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        name: options.name,
        description: options.description,
        frequency: options.frequency,
        customCron: options.customCron,
        timeframe: options.timeframe,
        nextRun,
        recipients: options.recipients,
        notifyOnChanges: options.notifyOnChanges,
      },
    });
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.prisma.reportSchedule.delete({
      where: { id: scheduleId },
    });
  }

  async toggleScheduleStatus(scheduleId: string, status: 'ACTIVE' | 'PAUSED' | 'DISABLED'): Promise<any> {
    return this.prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { status },
    });
  }

  async processScheduledReports(): Promise<void> {
    const now = new Date();
    const dueSchedules = await this.prisma.reportSchedule.findMany({
      where: {
        nextRun: {
          lte: now,
        },
        status: 'ACTIVE',
      },
      include: {
        report: {
          include: {
            competitor: true,
          },
        },
      },
    });

    for (const schedule of dueSchedules) {
      try {
        // Generate the report
        const report = await this.reportGenerator.generateReport(
          schedule.report.competitorId,
          schedule.timeframe
        );

        // Check if we should notify based on changes
        const shouldNotify = !schedule.notifyOnChanges || this.hasSignificantChanges(report);

        if (shouldNotify) {
          // Send email notification
          await this.sendReportEmail(schedule, report);
        }

        // Update schedule
        await this.prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRun: now,
            nextRun: this.calculateNextRun(schedule.frequency as ScheduleOptions['frequency'], schedule.customCron),
          },
        });
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        // You might want to add error tracking or notifications here
      }
    }
  }

  private calculateNextRun(frequency: ScheduleOptions['frequency'], customCron?: string): Date {
    const now = new Date();

    if (customCron) {
      return cronParser.parseExpression(customCron).next().toDate();
    }

    switch (frequency) {
      case 'DAILY':
        return new Date(now.setDate(now.getDate() + 1));
      case 'WEEKLY':
        return new Date(now.setDate(now.getDate() + 7));
      case 'BIWEEKLY':
        return new Date(now.setDate(now.getDate() + 14));
      case 'MONTHLY':
        return new Date(now.setMonth(now.getMonth() + 1));
      default:
        throw new Error('Invalid frequency');
    }
  }

  private hasSignificantChanges(report: any): boolean {
    return report.metadata.significantChanges > 0;
  }

  private async sendReportEmail(schedule: any, report: any): Promise<void> {
    const emailHtml = this.generateEmailHtml(report);

    for (const recipient of schedule.recipients) {
      try {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM,
          to: recipient,
          subject: `${schedule.name} - ${new Date().toLocaleDateString()}`,
          html: emailHtml,
        });
      } catch (error) {
        console.error(`Error sending email to ${recipient}:`, error);
      }
    }
  }

  private generateEmailHtml(report: any): string {
    // Create a simple HTML template for the email
    return `
      <h1>${report.title}</h1>
      <p>${report.description}</p>
      
      <h2>Key Metrics</h2>
      <ul>
        <li>Analysis Period: ${report.metadata.dateRange.start} - ${report.metadata.dateRange.end}</li>
        <li>Analyses Performed: ${report.metadata.analysisCount}</li>
        <li>Significant Changes: ${report.metadata.significantChanges}</li>
      </ul>

      ${report.sections
        .map(
          (section: any) => `
        <h2>${section.title}</h2>
        <div>${section.content}</div>
      `
        )
        .join('')}
    `;
  }
} 