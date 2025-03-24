import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
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
  create(@Body() createTaskDto: CreateTaskDto, @Req() req: RequestWithUser) {
    createTaskDto.creatorId = req.user.id;
    return this.taskService.create(createTaskDto);
  }

  @Get()
  findAll() {
    return this.taskService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(+id);
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

