import { schedule } from 'node-cron';
import CrawlerService from './services/crawler';
import Connect from './services/mongo';
import { MONGO_USERNAME, MONGO_PASSWORD } from './utils/config';

//const db = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@ds113906.mlab.com:13906/${MONGO_USERNAME}`;

//Connect({ db });

const crawler = new CrawlerService();
crawler.crawl();

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
