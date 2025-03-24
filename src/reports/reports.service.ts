import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task, TaskStatus } from '../task/entities/task.entity';
import { Project, ProjectStatus } from '../project/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
    private readonly pdfService: PdfService,
  ) {}

  async getTaskCompletionRatePerUser() {
    try {
      const users = await this.userRepository.find();
      const completionRates = await Promise.all(
        users.map(async (user) => {
          const totalTasks = await this.taskRepository
            .createQueryBuilder('task')
            .innerJoin('task.assignedUsers', 'user')
            .where('user.id = :userId', { userId: user.id })
            .getCount();

          const completedTasks = await this.taskRepository
            .createQueryBuilder('task')
            .innerJoin('task.assignedUsers', 'user')
            .where('user.id = :userId', { userId: user.id })
            .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
            .getCount();

          const completionRate = totalTasks > 0 
            ? (completedTasks / totalTasks) * 100 
            : 0;

          return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            totalTasks,
            completedTasks,
            completionRate: completionRate.toFixed(2) + '%',
          };
        }),
      );

      return completionRates;
    } catch (error) {
      this.logger.error('Error getting task completion rates:', error);
      throw error;
    }
  }

  async getPendingTasksPerProject() {
    try {
      const projects = await this.projectRepository.find();
      const pendingTasks = await Promise.all(
        projects.map(async (project) => {
          const pendingCount = await this.taskRepository
            .createQueryBuilder('task')
            .where('task.project.id = :projectId', { projectId: project.id })
            .andWhere('task.status = :status', { status: TaskStatus.PENDING })
            .getCount();

          return {
            projectId: project.id,
            projectTitle: project.title,
            pendingTasksCount: pendingCount,
          };
        }),
      );

      return pendingTasks;
    } catch (error) {
      this.logger.error('Error getting pending tasks:', error);
      throw error;
    }
  }

  async sendDailySummaryToAdmins() {
    try {
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { role: UserRole.ADMIN }
      });

      // Get all managers who have tasks assigned to them
      const managersWithTasks = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.assignedTasks', 'task')
        .where('user.role = :role', { role: UserRole.MANAGER })
        .andWhere('task.status != :status', { status: TaskStatus.COMPLETED })
        .getMany();

      // Generate daily summary
      const summary = await this.getDailySummary();

      // Generate PDF report
      const pdfBuffer = await this.pdfService.generateDailyReportPdf(summary);

      // Send email to admins
      const adminEmailPromises = adminUsers.map(admin => 
        this.mailerService.sendMail({
          to: admin.email,
          subject: 'Daily Task Summary Report (Admin)',
          html: `
            <h2>Daily Task Summary Report</h2>
            <p>Dear ${admin.firstName} ${admin.lastName},</p>
            <p>Here is your daily summary of tasks:</p>
            <ul>
              <li>Tasks Created: ${summary.tasksCreated}</li>
              <li>Tasks Completed: ${summary.tasksCompleted}</li>
              <li>Projects Created: ${summary.projectsCreated}</li>
              <li>Projects Completed: ${summary.projectsCompleted}</li>
              <li>Active Users: ${summary.activeUsers}</li>
            </ul>
            <p>Please find the detailed report attached.</p>
          `,
          attachments: [
            {
              filename: 'daily-summary.pdf',
              content: pdfBuffer,
            },
          ],
        })
      );

      // Send email to managers with their specific tasks
      const managerEmailPromises = managersWithTasks.map(async (manager) => {
        // Get tasks assigned to this manager
        const managerTasks = await this.taskRepository
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.project', 'project')
          .innerJoin('task.assignedUsers', 'assignedUser')
          .where('assignedUser.id = :managerId', { managerId: manager.id })
          .getMany();

        const pendingTasks = managerTasks.filter(task => task.status !== TaskStatus.COMPLETED);
        const completedTasks = managerTasks.filter(task => task.status === TaskStatus.COMPLETED);

        return this.mailerService.sendMail({
          to: manager.email,
          subject: 'Your Daily Task Summary Report',
          html: `
            <h2>Your Daily Task Summary Report</h2>
            <p>Dear ${manager.firstName} ${manager.lastName},</p>
            <p>Here is your daily task summary:</p>
            <h3>Pending Tasks (${pendingTasks.length})</h3>
            <ul>
              ${pendingTasks.map(task => `
                <li>${task.title} (Project: ${task.project?.title || 'No Project'})</li>
              `).join('')}
            </ul>
            <h3>Completed Tasks (${completedTasks.length})</h3>
            <ul>
              ${completedTasks.map(task => `
                <li>${task.title} (Project: ${task.project?.title || 'No Project'})</li>
              `).join('')}
            </ul>
            <p>Please find the detailed report attached.</p>
          `,
          attachments: [
            {
              filename: 'daily-summary.pdf',
              content: pdfBuffer,
            },
          ],
        });
      });

      // Send all emails
      await Promise.all([...adminEmailPromises, ...managerEmailPromises]);

      return {
        message: 'Daily summary sent successfully',
        recipients: {
          admins: adminUsers.length,
          managers: managersWithTasks.length
        }
      };
    } catch (error) {
      this.logger.error('Error sending daily summary:', error);
      throw new Error(`Failed to send daily summary: ${error.message}`);
    }
  }

  async getTaskCompletionRate() {
    const totalTasks = await this.taskRepository.count();
    const completedTasks = await this.taskRepository.count({
      where: { status: TaskStatus.COMPLETED }
    });

    const statusBreakdown = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const reportData = {
      totalTasks,
      completedTasks,
      completionRate,
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: parseInt(item.count)
      }))
    };

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateTaskCompletionReport(reportData);

    // Send email to admins with PDF attachment
    await this.sendReportEmail('Task Completion Rate Report', reportData, pdfBuffer);

    return reportData;
  }

  async getDailySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksCompleted = await this.taskRepository.count({
      where: {
        status: TaskStatus.COMPLETED,
        updatedAt: today
      }
    });

    const tasksCreated = await this.taskRepository.count({
      where: {
        createdAt: today
      }
    });

    const projectsCompleted = await this.projectRepository.count({
      where: {
        status: ProjectStatus.COMPLETED,
        updatedAt: today
      }
    });

    const projectsCreated = await this.projectRepository.count({
      where: {
        createdAt: today
      }
    });

    const activeUsers = await this.userRepository.count({
      where: {
        lastLogin: today
      }
    });

    const summary = {
      date: today.toISOString().split('T')[0],
      tasksCompleted,
      tasksCreated,
      projectsCompleted,
      projectsCreated,
      activeUsers
    };

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateDailyReportPdf(summary);

    // Send email to admins with PDF attachment
    await this.sendReportEmail('Daily Summary Report', summary, pdfBuffer);

    return summary;
  }

  private async sendReportEmail(subject: string, data: any, pdfBuffer: Buffer) {
    // Get all admin users
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN }
    });

    if (admins.length === 0) {
      console.log('No admin users found to send report to');
      return;
    }

    // Send email to each admin
    for (const admin of admins) {
      try {
        await this.mailerService.sendMail({
          to: admin.email,
          subject: subject,
          template: 'daily-report',
          context: {
            adminName: admin.email.split('@')[0],
            reportData: data,
            date: new Date().toLocaleDateString()
          },
          attachments: [
            {
              filename: `daily-report-${new Date().toISOString().split('T')[0]}.pdf`,
              content: pdfBuffer
            }
          ]
        });
      } catch (error) {
        console.error(`Failed to send report email to admin ${admin.email}:`, error);
      }
    }
  }

  async generateAndSendUserReport(userId: number) {
    try {
      // Get the user who is generating the report
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Get all tasks assigned to this user
      const userTasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.project', 'project')
        .innerJoin('task.assignedUsers', 'assignedUser')
        .where('assignedUser.id = :userId', { userId })
        .getMany();

      // Calculate task statistics
      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter(task => task.status === TaskStatus.COMPLETED).length;
      const pendingTasks = userTasks.filter(task => task.status !== TaskStatus.COMPLETED).length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Get all admins and managers
      const adminUsers = await this.userRepository.find({
        where: { role: UserRole.ADMIN }
      });

      const managerUsers = await this.userRepository.find({
        where: { role: UserRole.MANAGER }
      });

      // Generate PDF report
      const reportData = {
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        tasks: userTasks.map(task => ({
          title: task.title,
          status: task.status,
          project: task.project?.title || 'No Project',
          dueDate: task.dueDate
        }))
      };

      const pdfBuffer = await this.pdfService.generateUserReport(reportData);

      // Send email to admins
      const adminEmailPromises = adminUsers.map(admin => 
        this.mailerService.sendMail({
          to: admin.email,
          subject: `User Report - ${user.firstName} ${user.lastName}`,
          html: `
            <h2>User Report</h2>
            <p>Dear ${admin.firstName} ${admin.lastName},</p>
            <p>Here is the report for user ${user.firstName} ${user.lastName}:</p>
            <ul>
              <li>Total Tasks: ${totalTasks}</li>
              <li>Completed Tasks: ${completedTasks}</li>
              <li>Pending Tasks: ${pendingTasks}</li>
              <li>Completion Rate: ${completionRate.toFixed(2)}%</li>
            </ul>
            <p>Please find the detailed report attached.</p>
          `,
          attachments: [
            {
              filename: `user-report-${user.firstName}-${user.lastName}.pdf`,
              content: pdfBuffer,
            },
          ],
        })
      );

      // Send email to managers
      const managerEmailPromises = managerUsers.map(manager => 
        this.mailerService.sendMail({
          to: manager.email,
          subject: `User Report - ${user.firstName} ${user.lastName}`,
          html: `
            <h2>User Report</h2>
            <p>Dear ${manager.firstName} ${manager.lastName},</p>
            <p>Here is the report for user ${user.firstName} ${user.lastName}:</p>
            <ul>
              <li>Total Tasks: ${totalTasks}</li>
              <li>Completed Tasks: ${completedTasks}</li>
              <li>Pending Tasks: ${pendingTasks}</li>
              <li>Completion Rate: ${completionRate.toFixed(2)}%</li>
            </ul>
            <p>Please find the detailed report attached.</p>
          `,
          attachments: [
            {
              filename: `user-report-${user.firstName}-${user.lastName}.pdf`,
              content: pdfBuffer,
            },
          ],
        })
      );

      // Send all emails
      await Promise.all([...adminEmailPromises, ...managerEmailPromises]);

      return {
        message: 'User report sent successfully to admins and managers',
        report: reportData
      };
    } catch (error) {
      this.logger.error('Error generating user report:', error);
      throw new Error(`Failed to generate user report: ${error.message}`);
    }
  }
} 