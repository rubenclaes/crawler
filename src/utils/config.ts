import * as dotenv from 'dotenv';

dotenv.config();
let path;
switch (process.env.NODE_ENV) {
  case 'test':
    path = `${__dirname}/../../.env.test`;
    break;
  case 'production':
    path = `${__dirname}/../../.env.production`;
    break;
  default:
    path = `${__dirname}/../../.env.development`;
}
dotenv.config({ path: path });

export const LOGIN_NAME = process.env.LOGIN_NAME;
export const PASSWORD = process.env.PASSWORD;
export const GMAIL_USER = process.env.GMAIL_USER;
export const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
