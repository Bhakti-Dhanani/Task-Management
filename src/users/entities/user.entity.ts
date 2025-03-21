
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(
    {
        type:'varchar',
        nullable:false,
        length:100
    }
)
firstName:string;

@Column( {
    type: 'varchar',
    nullable: true, // Allow NULL values for now
    length: 100,
    default: ''
})
lastName:string;


  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;
}
