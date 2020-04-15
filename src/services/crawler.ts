import chalk from 'chalk';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Adblocker from 'puppeteer-extra-plugin-adblocker';

import { MailService } from './mail';

import { LOGIN_NAME, PASSWORD } from '../utils/config';
import path from 'path';
import {
  upsertSupermarket,
  findSupermarket,
} from '../controllers/supermarketController';

export default class CrawlerService {
  private pageUrl =
    'https://colruyt.collectandgo.be/cogo/nl/afhaalpunt-beschikbaarheid';
  private filterValue = 'HASSELT (COLRUYT)';
  private browser: any;
  private mailService = new MailService();

  async crawl(pageUrl?: string) {
    console.info('Starting crawlerservice');

    if (pageUrl) {
      this.pageUrl = pageUrl;
    }
    // Launch browser
    this.browser = await puppeteer.use(StealthPlugin()).launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    console.log('browser launched');
    // Wait for new Page created
    const page = await this.browser.newPage();
    console.log('new Page created');
    //turns request interceptor on
    await page.setRequestInterception(true);

    //if the page makes a  request to a resource type of image or stylesheet then abort that request
    page.on('request', (request: any) => {
      if (request.resourceType() === 'image') request.abort();
      else request.continue();
    });
    //await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(this.pageUrl, { waitUntil: 'networkidle2', timeout: 0 });
      await page.waitFor(6000);
      await page.screenshot({
        path: 'beschikbaarheid.png',
        fullPage: true,
      });

      console.log('Picture taken!');

      const newWinners = await page.evaluate(() => {
        const rowNodeList = document.querySelectorAll(
          '#mainContent > div > div > div.col-md-9 > div > div > table > tbody > tr',
        );
        const rowArray = Array.from(rowNodeList);

        return rowArray.slice(1).map((tr) => {
          const dataNodeList = tr.querySelectorAll('td');
          const dataArray = Array.from(dataNodeList);
          const [name, day1, day2, day3, day4, day5, day6] = dataArray.map(
            (td) => td.textContent,
          );

          return {
            name,
            day1,
            day2,
            day3,
            day4,
            day5,
            day6,
          };
        });
      });

      const store = this.filterByValue(newWinners, this.filterValue);

      const search = 'beschikbaar';

      const res = store.filter((obj) =>
        Object.values(obj).some((val) => val.includes(search)),
      );

      if (res.length != 0) {
        console.log(res);
        const text = `Er zijn terug slots vrij in ${store[0].name}!`;
        console.log(text);

        this.mailService
          .sendMail(
            ['noa-swinnen@hotmail.com', 'ruben.claes@euri.com'],
            store[0].name,
            text,
            'beschikbaarheid.png',
          )
          .then((msg) => {
            console.log(`sendMail result :(${msg})`);
          });
      }

      /*    await upsertSupermarket(
        store[0].name.toString(),
        store[0].day1.toString(),
        store[0].day2.toString(),
        store[0].day3.toString(),
        store[0].day4.toString(),
        store[0].day5.toString(),
        store[0].day6.toString(),
      );
 */
      const formattedStore = this.outputJSON(store);

      // await this.checkDifference();

      console.log(formattedStore);

      await this.browser.close();
      console.info('Crawlerservice ended');
    } catch (error) {
      this.mailService
        .sendMail(
          ['ruben.claes@euri.com'],
          'Error: Crawling',
          error,
          'beschikbaarheid.png',
        )
        .then((msg) => {
          console.log(`sendMail result :(${msg})`);
        });
      console.error(error);
    }
  }

  async checkDifference() {
    await findSupermarket({ name: 'john', age: { $gte: 18 } });
  }

  filter() {
    const filterWinners = (winners) => {
      return winners.filter((winner) => {
        return AREA_PATTERNS.some((pattern) => pattern.test(winner.area));
      });
    };
  }

  filterByValue(array, string) {
    return array.filter((o) =>
      Object.keys(o).some((k) =>
        o[k].toLowerCase().includes(string.toLowerCase()),
      ),
    );
  }

  outputJSON(array: []) {
    if (array.length) {
      return JSON.stringify(array, null, 2);
    } else {
      console.log('Nothing found');
      return array;
    }
  }

  async login(page: any) {
    console.log('Trying to log in!');
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

    //console.log(page.frames());

    const frame = await page
      .frames()
      .find((f: any) => f.url().includes('ecustomermw'));

    //console.log(frame.url());

    await frame.type('input[name="loginName"]', LOGIN_NAME);
    await frame.type('input[name="password"]', PASSWORD);
    await frame.click('#loginBtn');

    await page.waitFor(6000);

    await this.checkAvailability(page);
  }

  async checkAvailability(page: any) {
    //colruyt.collectandgo.be/cogo/nl/afhaalpunt-beschikbaarheid
    const checkTimesBtn = await page.$(`[data-menutab="dashBoard"]`);

    if (checkTimesBtn) {
      await checkTimesBtn.click();
    } else {
      console.error('checkTimesBtn button not found');
    }

    await page.waitFor(5000);

    await page.screenshot({
      path: 'availibility.png',
      fullPage: true,
    });

    console.log('availibility picture taken');

    await page.waitForSelector(`[data-shops="Colruyt"]`);

    const chooseTimesBtn = await page.$$(`[data-shops="Colruyt"]`);

    console.log(chooseTimesBtn[5]);

    //wait page.click(chooseTimesButton);
    /*   await page.evaluate(() => {
      document.querySelectorAll('[data-shops="Colruyt"]')[5].click();
    }); */

    /*   if (data.chooseTimeBtn) {
      await page.evaluate(() => {
        let chooseTimesButn = document.querySelectorAll(
          '[data-shops="Colruyt"]',
        )[5] as HTMLElement;
        chooseTimesButn.click();
      });
    } else {
      this.mailService
        .sendMail(
          ['ruben.claes@euri.com'],
          'Error: Crawling',
          'chooseTimeBtn button not found',
          'availibility.png',
        )
        .then((msg) => {
          console.log(`sendMail result :(${msg})`);
        });
      console.error('chooseTimeBtn button not found');
      throw new Error('chooseTimeBtn button not found');
    } */

    /*    await page.waitFor(3000);

    await page.screenshot({
      path: 'times.png',
      fullPage: false,
    });

    const timesDom = await page.$(
      '#collectingdayForm > div > div:nth-child(1) > p',
    );

    if (timesDom) {
      const text = await page.evaluate(
        (timesDom: any) => timesDom.textContent,
        timesDom,
      );
      console.log(text);

      return text;
    } else {
      const text = 'Er zijn terug slots vrij in Colruyt Hasselt!';
      console.log(text);

      this.mailService
        .sendMail(
          ['', 'ruben.claes@euri.com'],
          'Colruyt Hasselt',
          text,
          'times.png',
        )
        .then((msg) => {
          console.log(`sendMail result :(${msg})`);
        });
      return text;
    } */
  }
}
