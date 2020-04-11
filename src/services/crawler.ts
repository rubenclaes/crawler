import chalk from 'chalk';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

export default class Crawler {
  error = chalk.bold.red;
  warning = chalk.keyword('orange');
  success = chalk.keyword('green');

  private pageUrl = 'https://colruyt.collectandgo.be/cogo/nl/aanmelden';

  private browser: any;

  async crawl(pageUrl?: string) {
    if (pageUrl) {
      this.pageUrl = pageUrl;
    }
    this.browser = await puppeteer.use(StealthPlugin()).launch({
      headless: true,
      slowMo: 200,
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const page = await this.browser.newPage();
    //await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(this.pageUrl);
      await page.waitFor(6000);
      await page.screenshot({
        path: 'src/public/img/stealth.png',
        fullPage: true,
      });

      console.log(this.success('Picture taken!'));

      await this.login(page);

      await this.browser.close();
    } catch (error) {
      console.error(this.error(error));
    }
  }

  async login(page: any) {
    /*  const loginBtn = await page.$(
      'body > header > div.nav-top > div > div > div.nav-top__session.text-right > ul > li.session__xtra > button',
    );
    if (loginBtn) {
      await loginBtn.click();
    } else {
      console.error(this.warning('Login button not found'));
    } */

    //await page.type('#login_field', process.env.GITHUB_USER);
    // handle frame

    await page.waitForSelector('iframe[src*=ecustomermw]');

    console.log(page.frames());

    const frame = await page
      .frames()
      .find((f) => f.url().includes('ecustomermw'));

    console.log(frame.url());

    await frame.type('input[name="loginName"]', 'rubenclaes@outlook.com');
    await frame.type('input[name="password"]', `Nbaster12'`);
    await frame.click('#loginBtn');

    await page.waitFor(8000);

    await this.checkAvailability(page);
  }

  async checkAvailability(page: any) {
    const checkTimesBtn = await page.$(
      'body > header > div.nav-top > div > div > div.nav-top__session.text-right > ul > li.session__collect.hidden-xs > span.time.hidden-sm > a"',
    );

    if (checkTimesBtn) {
      await checkTimesBtn.click();
    } else {
      console.error(this.warning('checkTimesBtn button not found'));
    }

    await page.waitFor(4000);

    const chooseTimeBtn = await page.$(
      '#popUpWindow > div.modal-dialog.modal-lg > div > div.modal-body.modal-dashboard > div.row.dashboard-row > div.col-md-11 > div:nth-child(1) > div.col-md-8 > span.timeslot > span',
    );

    if (chooseTimeBtn) {
      await chooseTimeBtn.click();
    } else {
      console.error(this.warning('chooseTimeBtn button not found'));
    }

    await page.waitFor(4000);
  }
}
