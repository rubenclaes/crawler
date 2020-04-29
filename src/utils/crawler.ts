import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { MailService } from '../services/mail';

import { LOGIN_NAME, PASSWORD } from './config';

import {
  findSupermarkets,
  findSupermarketAndUpdate,
} from '../controllers/supermarketController';

import { findUsers } from '../controllers/userController';
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

  async closeBrowser() {
    await this.browser.close();
    console.info('Crawlerservice ended');
  }

  async scrapeColruyt(pageUrl?: string, supermarkets?: string[]) {
    console.log(`Start scraping Collect and Go`);

    if (pageUrl) {
      this.pageUrl = pageUrl;
    }

    if (supermarkets) {
      this.supermarkets = supermarkets;
    }

    // Wait for new Page created
    this.page = await this.browser.newPage();
    console.log('New Page created');
    // Turns request interceptor on
    await this.page.setRequestInterception(true);

    // if the page makes a request to a resource type of image or stylesheet then abort that request
    this.page.on('request', (request: any) => {
      if (request.resourceType() === 'image') request.abort();
      else request.continue();
    });

    // await page.setViewport({ width: 1920, height: 1080 });

    await this.page.goto(this.pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 0,
    });

    // Take screenshot but wait until table is loaded
    await this.page.waitForSelector(
      '#mainContent > div > div > div.col-md-9 > div > div > table',
    );

    const table = await this.page.$(
      '#mainContent > div > div > div.col-md-9 > div > div > table',
    );

    if (table)
      await this.page
        .screenshot({
          path: 'beschikbaarheid.png',
          fullPage: true,
        })
        .then(() => console.log(`Availability picture taken.`));

    // await this.takeScreenshot('beschikbaarheid.png', true);

    // 1. Scrape the current days in thead row.
    const scrapeTheadData = await this.scrapeTheadData();

    // 2. Scrape Supermarkets
    const scrapedSupermarkets = await this.scrapeSupermarkets();

    // 3. Filter scraped supermarkets to get only the one we need data from.
    const filteredSupermarkets = this.filterScrapedData(
      scrapedSupermarkets,
      this.supermarkets,
    );

    // 3. Check differences between scraped supermarkets and dbsupermarkets
    if (filteredSupermarkets) {
      const dbSupermarkets = await findSupermarkets(this.supermarkets);
      dbSupermarkets.forEach(async (dbSupermarket: any, i) => {
        const filteredSupermarket = filteredSupermarkets[i];
        const changes = this.checkDifferences(
          filteredSupermarket,
          dbSupermarket,
          scrapeTheadData.hdrDates,
        );

        if (changes) {
          console.log(`Er is een verandering gedetecteerd`);
          const dbId = dbSupermarket._id;

          //4. Save scrapedSupermarket Data
          await this.saveData(dbId, filteredSupermarket);

          //5. Notify users if there are changes
          const search = 'beschikbaar';

          if (Object.values(filteredSupermarket.week).includes(search)) {
            //const text = `<h1>${filteredSupermarket.name}</h1><p> Er zijn terug slots vrij in ${filteredSupermarket.name}!</p><p> Dag1: ${filteredSupermarket.week.day1} Dag2: ${filteredSupermarket.week.day2} Dag3: ${filteredSupermarket.week.day3} Dag4: ${filteredSupermarket.week.day4} Dag5: ${filteredSupermarket.week.day5} Dag6: ${filteredSupermarket.week.day6} </p> <p>https://colruyt.collectandgo.be/cogo/nl/afhaalpunt-beschikbaarheid</p> `;
            await this.sendEmail(filteredSupermarket, scrapeTheadData);
          }
        } else {
          //5. No changes
          console.log(`Geen verandering gedetecteerd`);
        }
      });
    }
  }

  async scrapeTheadData() {
    console.info(`Scraping thead data`);

    const scrapedCurrentDays = await this.page.evaluate(() => {
      const rowNodeList = document.querySelectorAll('table thead tr th');
      const ths = Array.from(rowNodeList);

      const [
        hdrTtl,
        hdrDate1,
        hdrDate2,
        hdrDate3,
        hdrDate4,
        hdrDate5,
        hdrDate6,
      ] = ths.map((th) => {
        return th.textContent;
      });

      console.log(hdrTtl);

      return {
        hdrTtl,
        hdrDates: {
          hdrDate1,
          hdrDate2,
          hdrDate3,
          hdrDate4,
          hdrDate5,
          hdrDate6,
        },
      };
    });

    return scrapedCurrentDays;
  }

  async scrapeSupermarkets() {
    console.log(`Start scraping supermarkets`);

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

    // console.log(scrapedSupermarkets);
    return scrapedSupermarkets;
  }

  checkDifferences(
    scrapedSupermarket: SupermarketDocument,
    dbSupermarket: SupermarketDocument,
    hdrDates: any,
  ): boolean {
    console.log(`Checking Differences`);

    const noOfdays = Object.keys(hdrDates).length;

    for (let index = 0; index < noOfdays; index++) {
      console.log(dbSupermarket.week);
      console.log(scrapedSupermarket.week);
      if (
        Object.values(dbSupermarket.week)[1 + index] !==
        Object.values(scrapedSupermarket.week)[index]
      ) {
        console.log(JSON.stringify(Object.values(dbSupermarket.week)));

        console.log(Object.values(scrapedSupermarket.week));
        return true;
      }
    }

    return false;
  }

  async sendEmail(supermarketData: any, scrapeTheadData: any) {
    const users = (await findUsers()).map((user) => {
      return user['email'];
    });

    console.log(users);
    this.mailService
      .sendMail(
        users,
        supermarketData.name,
        supermarketData,
        scrapeTheadData,
        'beschikbaarheid.png',
      )
      .then((msg) => {
        console.log(`sendMail result :(${msg})`);
      });
  }

  async saveData(dbId: any, scrapedSupermarket: any) {
    await findSupermarketAndUpdate(dbId, scrapedSupermarket);
  }

  async takeScreenshot(path: string, fullPage: boolean) {
    // take a picture
    await this.page.screenshot({
      path: path,
      fullPage: fullPage,
    });
    console.log('Picture taken!');
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
