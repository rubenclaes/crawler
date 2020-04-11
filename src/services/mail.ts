import * as nodemailer from 'nodemailer';

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'rubebotto@gmail.com',
        pass: `Nbaster1992'`,
      },
    });
  }

  sendMail(to: string[], subject: string, content: string): Promise<void> {
    const options = {
      from: 'rubes.claes@gmail.com',
      to: to,
      subject: subject,
      text: content,
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
  }
}
