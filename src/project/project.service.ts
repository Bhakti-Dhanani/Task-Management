import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { ProjectStatus } from './entities/project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const manager = await this.userRepository.findOne({
      where: { 
        id: createProjectDto.assignedManagerId, 
        role: UserRole.MANAGER 
      }
    });

    if (!manager) {
      throw new BadRequestException('Invalid manager ID or user is not a manager');
    }

    const project = this.projectRepository.create({
      ...createProjectDto,
      assignedManager: manager,
      status: ProjectStatus.PENDING,
    });

    return this.projectRepository.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      relations: ['assignedManager', 'tasks'],
    });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['assignedManager', 'tasks'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    if (updateProjectDto.status === ProjectStatus.COMPLETED && project.status !== ProjectStatus.COMPLETED) {
      await this.notificationService.createProjectCompletedNotification(project);
    }

    if (updateProjectDto.assignedManagerId) {
      const manager = await this.userRepository.findOne({
        where: { 
          id: updateProjectDto.assignedManagerId, 
          role: UserRole.MANAGER 
        }
      });

      if (!manager) {
        throw new BadRequestException('Invalid manager ID or user is not a manager');
      }

      project.assignedManager = manager;
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
  }
}
