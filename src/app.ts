/**
 * Required External Modules
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

/**
 * App Variables
 */
import Crawler from './utils/crawler';
import Connect from './services/mongo';
import { PORT, MONGO_USERNAME, MONGO_PASSWORD } from './utils/config';

const port: number = parseInt(PORT as string, 10);
const db = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@ds113906.mlab.com:13906/${MONGO_USERNAME}`;

// Create Express server
//const app = express();

/**
 *  App Configuration
 */

//app.use(helmet());
//app.use(cors());
//app.use(express.json());

Connect({ db });

const crawlColruytHasselt = async () => {
  const crawler = new Crawler(true);
  await crawler.launchPuppeteer();
  try {
    await crawler.scrapeColruyt();
  } catch (error) {
    console.error(error);
  }
  await crawler.closeBrowser();
};

await crawlColruytHasselt();

process.on('SIGTERM', (signal) => {
  console.log(`Process ${process.pid} has been interrupted`);
  process.exit(0);
});

process.on('uncaughtException', (e) => {
  console.log(e);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.log(e);
  process.exit(1);
});
