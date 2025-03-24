import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

interface DailySummary {
  date: string;
  tasksCompleted: number;
  tasksCreated: number;
  projectsCompleted: number;
  projectsCreated: number;
  activeUsers: number;
}

interface TaskCompletionReport {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}

interface UserReport {
  userName: string;
  email: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  tasks: Array<{
    title: string;
    status: string;
    project: string;
    dueDate: Date;
  }>;
}

@Injectable()
export class PdfService {
  async generateDailyReportPdf(summary: DailySummary): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      
      // Generate HTML content
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              .summary-item { margin: 10px 0; }
              .date { color: #666; }
            </style>
          </head>
          <body>
            <h1>Daily Task Summary Report</h1>
            <div class="date">Date: ${summary.date}</div>
            <div class="summary-item">Tasks Created: ${summary.tasksCreated}</div>
            <div class="summary-item">Tasks Completed: ${summary.tasksCompleted}</div>
            <div class="summary-item">Projects Created: ${summary.projectsCreated}</div>
            <div class="summary-item">Projects Completed: ${summary.projectsCompleted}</div>
            <div class="summary-item">Active Users: ${summary.activeUsers}</div>
          </body>
        </html>
      `;

      await page.setContent(html);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async generateTaskCompletionReport(report: TaskCompletionReport): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      
      // Generate HTML content
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              .summary-item { margin: 10px 0; }
              .status-breakdown { margin-top: 20px; }
              .status-item { margin: 5px 0; }
            </style>
          </head>
          <body>
            <h1>Task Completion Rate Report</h1>
            <div class="summary-item">Total Tasks: ${report.totalTasks}</div>
            <div class="summary-item">Completed Tasks: ${report.completedTasks}</div>
            <div class="summary-item">Completion Rate: ${report.completionRate.toFixed(2)}%</div>
            <div class="status-breakdown">
              <h2>Status Breakdown</h2>
              ${report.statusBreakdown.map(item => `
                <div class="status-item">${item.status}: ${item.count}</div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      await page.setContent(html);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async generateUserReport(report: UserReport): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      
      // Generate HTML content
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              .summary-item { margin: 10px 0; }
              .task-list { margin-top: 20px; }
              .task-item { margin: 5px 0; padding: 5px; border-bottom: 1px solid #eee; }
              .task-title { font-weight: bold; }
              .task-status { color: #666; }
              .task-project { color: #888; }
              .task-due-date { color: #999; }
            </style>
          </head>
          <body>
            <h1>User Task Report</h1>
            <div class="summary-item">User: ${report.userName}</div>
            <div class="summary-item">Email: ${report.email}</div>
            <div class="summary-item">Total Tasks: ${report.totalTasks}</div>
            <div class="summary-item">Completed Tasks: ${report.completedTasks}</div>
            <div class="summary-item">Pending Tasks: ${report.pendingTasks}</div>
            <div class="summary-item">Completion Rate: ${report.completionRate.toFixed(2)}%</div>
            
            <div class="task-list">
              <h2>Task Details</h2>
              ${report.tasks.map(task => `
                <div class="task-item">
                  <div class="task-title">${task.title}</div>
                  <div class="task-status">Status: ${task.status}</div>
                  <div class="task-project">Project: ${task.project}</div>
                  <div class="task-due-date">Due Date: ${new Date(task.dueDate).toLocaleDateString()}</div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      await page.setContent(html);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
} 