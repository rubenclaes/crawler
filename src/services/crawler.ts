import chalk from 'chalk';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

export default class Crawler {
  error = chalk.bold.red;
  warning = chalk.keyword('orange');
  success = chalk.keyword('green');

  private pageUrl = 'https://colruyt.collectandgo.be/cogo/nl/home';

  async crawl(pageUrl?: string) {
    if (pageUrl) {
      this.pageUrl = pageUrl;
    }
    const browser = await puppeteer
      .use(StealthPlugin())
      .launch({ headless: true, args: ['--no-sandbox'] });

    const page = await browser.newPage();

    try {
      await page.goto(this.pageUrl);
      await page.waitFor(5000);
      await page.screenshot({
        path: 'src/public/img/stealth.png',
        fullPage: true,
      });

      console.log(this.success('Picture taken!'));
      await browser.close();
    } catch (error) {
      console.error(this.error(error));
    }
  }
}
