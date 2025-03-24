import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,  
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,  
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ||'1234',
  database: process.env.DB_NAME || 'ecommerce',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: true, 
  migrationsTableName: 'migrations',
  migrations: ['dist/migrations/*.js'], 
  entities: ['dist/**/*.entity.js'], // Load entity files
}));


const databaseSettings = databaseConfig() as unknown as DataSourceOptions;  // Extract object from registerAs

export const dataSourceOptions: DataSourceOptions = {
  ...databaseSettings,  // Spread the extracted object
};

export const dataSource = new DataSource(dataSourceOptions);
