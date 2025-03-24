import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  async create(@Body() createTaskDto: CreateTaskDto, @Req() req: RequestWithUser) {
    return this.taskService.create(createTaskDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.taskService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      const taskId = parseInt(id, 10);
      if (isNaN(taskId)) {
        throw new BadRequestException('Invalid task ID format');
      }
      return await this.taskService.findOne(taskId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error in findOne controller:', error);
      throw new InternalServerErrorException('An error occurred while retrieving the task');
    }
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Req() req: RequestWithUser) {
    return this.taskService.update(+id, updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER)
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.taskService.remove(+id, req.user.id);
  }
}

