import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseConfig } from './config/db.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import jwtConfig from './config/jwt.config';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { User } from './users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from './notification/notification.module';
import { MailerConfigModule } from './config/mailer.module';
import { Task } from './task/entities/task.entity';
import { Project } from './project/entities/project.entity';
import { Notification } from './notification/entities/notification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { 
          expiresIn: configService.get('jwt.signOptions.expiresIn') 
        },
      }),
      global: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        logging: configService.get<boolean>('database.logging'),
        synchronize: true,
        dropSchema: true,
        migrationsRun: true,
        migrations: ['dist/migrations/*.js'],
        autoLoadEntities: true,
        entities: [User, Task, Project, Notification],
        ssl: false,
        extra: {
          max: 20,
        }
      }),
    }),
    EventEmitterModule.forRoot(),
    MailerConfigModule,
    UsersModule,
    AuthModule,
    ProjectModule,
    TaskModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
