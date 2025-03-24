import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('The Task Management API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Try to use port 3000, if not available use 3001
  try {
    await app.listen(3000);
    console.log('Application is running on: http://localhost:3000');
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      await app.listen(3001);
      console.log('Application is running on: http://localhost:3001');
    } else {
      throw error;
    }
  }
}
bootstrap();
