import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import{ databaseConfig} from './config/db.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import jwtConfig from './config/jwt.config';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';




@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load:[databaseConfig,jwtConfig],
  }),
    TypeOrmModule.forRootAsync({
      imports:[ConfigModule],
      inject:[ConfigService],
      useFactory:async (configService:ConfigService)=>({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        logging: configService.get<boolean>('database.logging'),
        synchronize: true, // Use migrations
        migrationsRun: true, // Run pending migrations on startup
        migrations: ['dist/migrations/*.js'],
        autoLoadEntities: true,

      }),
    }),
    UsersModule,
    AuthModule,
    
    
],
  controllers: [AppController],
  providers: [AppService,
     {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
],
})
export class AppModule {}
