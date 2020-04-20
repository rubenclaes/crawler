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
export const MONGO_URI = process.env.MONGO_URI;
export const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
export const MONGO_USERNAME = process.env.MONGO_USERNAME;
export const PORT = process.env.PORT;
