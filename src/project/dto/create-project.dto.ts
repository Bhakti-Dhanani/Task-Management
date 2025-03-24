import { IsString, IsNotEmpty, IsOptional, IsDate, IsEnum, IsNumber, MinLength, MaxLength, MinDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '../entities/project.entity';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsDate()
  @Type(() => Date)
  @MinDate(new Date())
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @MinDate(new Date())
  endDate: Date;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsNumber()
  assignedManagerId: number;
}

