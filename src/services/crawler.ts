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
      .launch({ headless: false, slowMo: 200 });

    const page = await browser.newPage();
    //await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(this.pageUrl);
      await page.waitFor(5000);
      await page.screenshot({
        path: 'src/public/img/stealth.png',
        fullPage: true,
      });

      console.log(this.success('Picture taken!'));

      await this.login(page);

      await browser.close();
    } catch (error) {
      console.error(this.error(error));
    }
  }

  async login(page: any) {
    const loginBtn = await page.$(
      'body > header > div.nav-top > div > div > div.nav-top__session.text-right > ul > li.session__xtra > button',
    );
    if (loginBtn) {
      await loginBtn.click();
    } else {
      console.error(this.warning('Login button not found'));
    }

    await page.waitFor(5000);
  }
}
