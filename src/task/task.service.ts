import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from 'src/users/entities/user.entity';
import { Project } from 'src/project/entities/project.entity';
import { UserRole } from 'src/users/entities/user.entity';
import { TaskStatus } from './entities/task.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private notificationService: NotificationService,
  ) {}

  private async checkOverlappingTasks(userId: number, dueDate: Date): Promise<void> {
    const existingTasks = await this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.assignedUsers', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('task.status != :completedStatus', { completedStatus: 'completed' })
      .getMany();

    const hasOverlap = existingTasks.some(task => {
      const taskDueDate = new Date(task.dueDate);
      const newDueDate = new Date(dueDate);
      return Math.abs(taskDueDate.getTime() - newDueDate.getTime()) < 24 * 60 * 60 * 1000; // 24 hours
    });

    if (hasOverlap) {
      throw new BadRequestException('User already has a task due within 24 hours of this task');
    }
  }

  private async validateManager(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { 
        id: userId,
        role: UserRole.MANAGER 
      }
    });

    if (!user) {
      throw new ForbiddenException('Only managers can create tasks');
    }

    return user;
  }

  private async validateTaskAccess(task: Task, userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ 
      where: { 
        id: userId,
        role: UserRole.MANAGER 
      }
    });
    
    if (!user) {
      throw new ForbiddenException('Only managers can modify tasks');
    }
  }

  async create(createTaskDto: CreateTaskDto) {
    const project = await this.projectRepository.findOne({
      where: { id: createTaskDto.projectId },
      relations: ['assignedManager'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate that the creator is a manager
    await this.validateManager(createTaskDto.creatorId);

    const task = this.taskRepository.create({
      ...createTaskDto,
      project,
      status: TaskStatus.PENDING,
    });

    const savedTask = await this.taskRepository.save(task);

    // Send notifications to assigned users
    for (const userId of createTaskDto.assignedUserIds) {
      const assignedUser = await this.userRepository.findOne({ where: { id: userId } });
      if (assignedUser) {
        await this.notificationService.createTaskAssignedNotification(savedTask, assignedUser);
      }
    }

    return savedTask;
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepository.find({
      relations: ['project', 'createdBy', 'assignedUsers'],
    });
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'createdBy', 'assignedUsers'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, userId: number) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'project.assignedManager'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Validate user access
    await this.validateTaskAccess(task, userId);

    // Check if task status is being updated to completed
    if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      await this.notificationService.createTaskCompletedNotification(task);
    }

    // Check for new assigned users
    if (updateTaskDto.assignedUserIds) {
      const newAssignedUsers = updateTaskDto.assignedUserIds.filter(
        userId => !task.assignedUsers.some(user => user.id === userId),
      );

      for (const userId of newAssignedUsers) {
        const assignedUser = await this.userRepository.findOne({ where: { id: userId } });
        if (assignedUser) {
          await this.notificationService.createTaskAssignedNotification(task, assignedUser);
        }
      }
    }

    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async remove(id: number, userId: number): Promise<void> {
    const task = await this.findOne(id);
    await this.validateTaskAccess(task, userId);
    await this.taskRepository.remove(task);
  }
}
