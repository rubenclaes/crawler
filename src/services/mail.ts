import * as nodemailer from 'nodemailer';
import ejs from 'ejs';

import { GMAIL_USER, GMAIL_PASSWORD } from '../utils/config';
import path from 'path';

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASSWORD,
      },
    });
  }

  async sendMail(
    to: string[],
    subject: string,
    data: object,
    image: string,
  ): Promise<void> {
    try {
      const template = path.resolve(__dirname, '../templates/crawler/html.ejs');

      //render ejs template to html string

      /*     const data = {
        name: 'string',
        week: {
          day1: 'beschikbaar',
          day2: 'string',
          day3: 'volzet',
          day4: 'string',
          day5: 'string',
          day6: 'beschikbaar',
        },
      }; */

      const html = await ejs
        .renderFile(template, data)
        .then((outputs) => outputs);

      const options = {
        from: `RubenBot <rubebotto@gmail.com>`,
        to: to,
        subject: subject,
        html: html,
        attachments: [
          {
            path: image,
          },
        ],
      };

      return new Promise<void>(
        (resolve: (msg: any) => void, reject: (err: Error) => void) => {
          this.transporter.sendMail(options, (error, info) => {
            if (error) {
              console.log(`error: ${error}`);
              reject(error);
            } else {
              console.log(`Message Sent 
                        ${info.response}`);
              resolve(`Message Sent  
                        ${info.response}`);
            }
          });
        },
      );
    } catch (error) {
      console.log(error);
    }
  }
}
