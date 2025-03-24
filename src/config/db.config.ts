import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,  
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,  
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'taskManagement',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: true,
  dropSchema: true, // This will drop all tables before creating new ones
  migrationsTableName: 'migrations',
  migrations: ['dist/migrations/*.js'], 
  entities: ['dist/**/*.entity.js'], // Load entity files
  ssl: false,
  extra: {
    max: 20, // Maximum number of connections in the pool
  }
}));

const databaseSettings = databaseConfig() as unknown as DataSourceOptions;

export const dataSourceOptions: DataSourceOptions = {
  ...databaseSettings,
};

export const dataSource = new DataSource(dataSourceOptions);
