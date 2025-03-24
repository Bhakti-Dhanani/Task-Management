import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from 'src/project/entities/project.entity';
import { User } from 'src/users/entities/user.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING
  })
  status: TaskStatus;

  @ManyToOne(() => Project, project => project.tasks, { nullable: true })
  project: Project | null;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User | null;

  @ManyToMany(() => User, user => user.tasks)
  @JoinTable()
  assignedUsers: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
