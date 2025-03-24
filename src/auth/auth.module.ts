import { Module, NestModule,MiddlewareConsumer, Inject } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from 'src/users/entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from 'src/common/middelware/auth.middleware';


@Module({
  imports:[UsersModule,TypeOrmModule.forFeature([User]),
JwtModule.registerAsync({
  imports:[ConfigModule],
  inject:[ConfigService],
  useFactory: async (configservice:ConfigService) =>({
    secret: configservice.get('jwt.secret'),
        signOptions: { expiresIn: configservice.get('jwt.expiresIn') },
  })
}),],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*'); // Apply middleware here
  }
}
