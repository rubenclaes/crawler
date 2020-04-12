import chalk from 'chalk';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Adblocker from 'puppeteer-extra-plugin-adblocker';

import { MailService } from './mail';

import { LOGIN_NAME, PASSWORD } from '../utils/config';
import path from 'path';

export default class CrawlerService {
  private pageUrl = 'https://colruyt.collectandgo.be/cogo/nl/aanmelden';

  private browser: any;

  private mailService = new MailService();

  async crawl(pageUrl?: string) {
    if (pageUrl) {
      this.pageUrl = pageUrl;
    }

    this.browser = await puppeteer

      .use(StealthPlugin())

      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

    console.log('browser launched');

    const page = await this.browser.newPage();
    //turns request interceptor on
    await page.setRequestInterception(true);

    //if the page makes a  request to a resource type of image or stylesheet then abort that request
    page.on('request', (request: any) => {
      if (request.resourceType() === 'image') request.abort();
      else request.continue();
    });
    //await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(this.pageUrl);
      await page.waitFor(6000);
      await page.screenshot({
        path: 'login.png',
        fullPage: true,
      });

      console.log('Picture taken!');

      await this.login(page);

      await this.browser.close();
      console.info('Tab Closed');
    } catch (error) {
      this.mailService
        .sendMail(
          ['ruben.claes@euri.com'],
          'Error: Crawling',
          error,
          'login.png',
        )
        .then((msg) => {
          console.log(`sendMail result :(${msg})`);
        });
      console.error(error);
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
    const checkTimesBtn = await page.$('[data-menutab="dashBoard"]');

    if (checkTimesBtn) {
      await checkTimesBtn.click();
    } else {
      console.error('checkTimesBtn button not found');
    }

    await page.waitFor(5000);

    const chooseTimeBtn = await page.$(
      '#popUpWindow > div.modal-dialog.modal-lg > div > div.modal-body.modal-dashboard > div.row.dashboard-row > div.col-md-11 > div:nth-child(1) > div.col-md-8 > span.timeslot > span',
    );

    if (chooseTimeBtn) {
      await chooseTimeBtn.click();
    } else {
      console.error('chooseTimeBtn button not found');
      throw new Error('chooseTimeBtn button not found');
    }

    await page.waitFor(3000);

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
    }
  }
}
