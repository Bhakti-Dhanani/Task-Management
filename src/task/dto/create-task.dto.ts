import { IsString, IsNotEmpty, IsOptional, IsDate, IsEnum, IsArray, IsNumber, MinLength, MaxLength, MinDate } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsDate()
  @Type(() => Date)
  @MinDate(new Date())
  dueDate: Date;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsArray()
  @IsNumber({}, { each: true })
  assignedUserIds: number[];

  @IsNumber()
  projectId: number;

  @IsNumber()
  @IsOptional()
  creatorId?: number;
}
