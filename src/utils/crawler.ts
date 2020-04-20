import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { diff } from 'deep-diff';
import * as _ from 'lodash';

import { MailService } from '../services/mail';

import { LOGIN_NAME, PASSWORD } from './config';
import { Supermarket } from './models/supermarket';
import {
  upsertSupermarket,
  findSupermarkets,
  insertSupermarkets,
  updateSupermarkets,
  findSupermarketAndUpdate,
} from '../controllers/supermarketController';
import { SupermarketDocument } from '../models/supermarket';

/**
 *  Crawler Class
 */
export default class Crawler {
  private pageUrl = `https://colruyt.collectandgo.be/cogo/nl/afhaalpunt-beschikbaarheid`;
  private supermarkets = [
    `HASSELT (COLRUYT)`,
    `NEERPELT (COLRUYT)`,
    `MOL (COLRUYT)`,
  ];

  private mailService = new MailService();

  private browser!: Browser;
  private page!: Page;
  private puppeteerOptions = { headless: true };

  constructor(headless = true) {
    this.puppeteerOptions.headless = headless;
  }

  async launchPuppeteer() {
    console.info('Launching Puppeteer');

    // Launch browser
    this.browser = await puppeteer.use(StealthPlugin()).launch({
      headless: this.puppeteerOptions.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    console.log('Browser Launched');
  }
  async scrapeColruyt(pageUrl?: string, supermarkets?: string[]) {
    console.log('Start scraping Colruyt');

    if (pageUrl) {
      this.pageUrl = pageUrl;
    }

    if (supermarkets) {
      this.supermarkets = supermarkets;
    }

    // Wait for new Page created
    this.page = await this.browser.newPage();
    console.log('new Page created');
    // Turns request interceptor on
    await this.page.setRequestInterception(true);

    // if the page makes a  request to a resource type of image or stylesheet then abort that request
    this.page.on('request', (request: any) => {
      if (request.resourceType() === 'image') request.abort();
      else request.continue();
    });
    // await page.setViewport({ width: 1920, height: 1080 });

    // await page.setViewport({ width: 1920, height: 1080 });
    await this.page.goto(this.pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 0,
    });

    // Take screenshot but wait until table is loaded
    await this.page
      .waitForSelector(
        '#mainContent > div > div > div.col-md-9 > div > div > table',
      )
      .then(() => {
        // take a picture
        this.takeScreenshot('beschikbaarheid.png', true);
      });

    // Scrape Supermarkets
    const scrapedSupermarkets = await this.scrapeSupermarkets();

    const filteredSupermarkets = this.filterScrapedData(
      scrapedSupermarkets,
      this.supermarkets,
    );

    //console.log(filteredSupermarkets);

    // Check Differnces
    if (filteredSupermarkets) {
      await this.checkDifferences(filteredSupermarkets);
    }
  }

  async scrapeSupermarkets() {
    const scrapedSupermarkets = await this.page.evaluate(() => {
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
          week: { day1, day2, day3, day4, day5, day6 },
          name,
        };
      });
    });

    //console.log(scrapedSupermarkets);
    return scrapedSupermarkets;
  }

  async checkDifferences(scrapedSupermarkets: SupermarketDocument[]) {
    console.log('Checking Differences');

    const dbSupermarkets = await findSupermarkets(this.supermarkets);
    let catchDifference = false;
    //const differences = diff(scrapedSupermarkets, foundSupermarkets);

    dbSupermarkets.forEach(async (dbSupermarket, i) => {
      const {
        week: { day1, day2, day3, day4, day5, day6 },
      } = dbSupermarket;
      if (
        dbSupermarket.week.day1 !== scrapedSupermarkets[i].week.day1 ||
        dbSupermarket.week.day2 !== scrapedSupermarkets[i].week.day2 ||
        dbSupermarket.week.day3 !== scrapedSupermarkets[i].week.day3 ||
        dbSupermarket.week.day4 !== scrapedSupermarkets[i].week.day4 ||
        dbSupermarket.week.day5 !== scrapedSupermarkets[i].week.day5 ||
        dbSupermarket.week.day6 !== scrapedSupermarkets[i].week.day6
      ) {
        console.log('verandering');
        console.log(scrapedSupermarkets[i]);
        const dbId = dbSupermarket._id;
        console.log(dbId);
        await this.saveData(dbId, scrapedSupermarkets[i]);

        const search = 'beschikbaar';
        const res = scrapedSupermarkets.filter((obj: any) =>
          Object.values(obj).some((val: any) => val.includes(search)),
        );

        if (res.length != 0) {
          console.log(res);
          const text = `<h1>${dbSupermarket.name}</h1><p> Er zijn terug slots vrij in ${dbSupermarket.name}!</p><p> Dag1: ${scrapedSupermarkets[i].week.day1} Dag2: ${scrapedSupermarkets[i].week.day1} Dag3: ${scrapedSupermarkets[i].week.day1} Dag4: ${scrapedSupermarkets[i].week.day1} Dag5: ${scrapedSupermarkets[i].week.day1} Dag6: ${scrapedSupermarkets[i].week.day1} </p> `;

          this.mailService
            .sendMail(
              ['noa-swinnen@hotmail.com', 'ruben.claes@euri.com'],
              dbSupermarket.name,
              text,
              'beschikbaarheid.png',
            )
            .then((msg) => {
              console.log(`sendMail result :(${msg})`);
            });
        }
      }
    });

    //console.log(differences);
    //console.log(result);

    if (dbSupermarkets.length == 0) {
      // Save the foundsupermrkets in db
    }
  }
  async saveData(dbId: any, scrapedSupermarket: SupermarketDocument) {
    await findSupermarketAndUpdate(dbId, scrapedSupermarket);
  }
  async sendEmail() {}
  async formatData() {}

  async takeScreenshot(path: string, fullPage: boolean): Promise<void> {
    // take a picture
    await this.page.screenshot({
      path: path,
      fullPage: fullPage,
    });
    console.log('Picture taken!');
  }

  async crawl() {
    console.info('Starting Crawler');

    // Launch browser

    await puppeteer
      .use(StealthPlugin())
      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      })
      .then(async (browser) => {
        console.info('Browser launched');

        // Wait for new Page created
        const page = await browser.newPage();
        console.info('New Page created');
        // turns request interceptor on
        await page.setRequestInterception(true);
        //if the page makes a  request to a resource type of image or stylesheet then abort that request
        page.on('request', (request: any) => {
          if (request.resourceType() === 'image') request.abort();
          else request.continue();
        });
        // await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(this.pageUrl, {
          waitUntil: 'networkidle2',
          timeout: 0,
        });
        // take a picture
        await page.screenshot({
          path: 'beschikbaarheid.png',
          fullPage: true,
        });
        console.log('Picture taken!');

        const supermarkets = await page.evaluate(() => {
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

        console.log(supermarkets);

        const store = this.filterByValue(newWinners, this.supermarket);

        const search = 'beschikbaar';

        const res = store.filter((obj: any) =>
          Object.values(obj).some((val: any) => val.includes(search)),
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
      });

    try {
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

      const store = this.filterByValue(newWinners, this.supermarket);

      const search = 'beschikbaar';

      const res = store.filter((obj: any) =>
        Object.values(obj).some((val: any) => val.includes(search)),
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

  filterByValue(array: any, value: string) {
    return array.filter((o: any) =>
      Object.keys(o).some((k) =>
        o[k].toLowerCase().includes(value.toLowerCase()),
      ),
    );
  }

  filterScrapedData(data: any, searchKeys: string[]) {
    return data.filter((obj: any) => {
      return Object.keys(obj).some((key) => searchKeys.includes(obj[key]));
    });
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
