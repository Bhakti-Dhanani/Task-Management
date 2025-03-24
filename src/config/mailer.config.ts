import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { MailerOptions } from '@nestjs-modules/mailer';

export default registerAs('mailer', (): MailerOptions => ({
  transport: {
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  defaults: {
    from: `"${process.env.SMTP_FROM_NAME || 'Task Management'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@taskmanagement.com'}>`,
  },
  template: {
    dir: join(__dirname, '../notification/templates'),
    adapter: require('@nestjs-modules/mailer/dist/adapters/handlebars.adapter'),
    options: {
      strict: true,
    },
  },
})); 