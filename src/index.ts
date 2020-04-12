import { schedule } from 'node-cron';
import CrawlerService from './services/crawler';

console.info('Starting crawlerservice');
const crawler = new CrawlerService();
crawler.crawl();
console.info('Crawlerservice ended');

/* 
const morningTask = schedule('10 * * * *', () => {
  console.log('crawler => starting');
  crawler.crawl();
  console.log('crawler => finished');
});

morningTask.start(); */

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
