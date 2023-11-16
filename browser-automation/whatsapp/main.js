const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
let cron = require("node-cron");

const delay = async (mintime, maxtime) => {
  const randomTime = Math.random() * (maxtime - mintime + 1) + mintime;
  await new Promise((resolve) => setTimeout(resolve, 1000 * randomTime));
};

const enterToWA = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "/usr/bin/google-chrome",
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1700, // Your desired width
    height: 800, // Your desired height
  });
  await page.goto("https://web.whatsapp.com/");
  await delay(5, 10);

  cron.schedule("10 15 * * *", async () => {
    await sendMessagesFunc(page);
  });
};

const sendMessagesFunc = async (page) => {
  const inputClass =
    "#side > div._3gYev > div > div._1EUay > div._2vDPL > div > div.to2l77zo.gfz4du6o.ag5g9lrv.bze30y65.kao4egtt.qh0vvdkp";
  const chatClass =
    "#pane-side > div > div > div > div:nth-child(2) > div > div";
  const chatClass2 =
    "#pane-side > div:nth-child(1) > div > div > div:nth-child(1) > div > div > div";
  const messageInputClass =
    "#main > footer > div._2lSWV._3cjY2.copyable-area > div > span:nth-child(2) > div > div._1VZX7 > div._3Uu1_ > div > div.to2l77zo.gfz4du6o.ag5g9lrv.bze30y65.kao4egtt";
  const messageSendButton =
    "#main > footer > div._2lSWV._3cjY2.copyable-area > div > span:nth-child(2) > div > div._1VZX7 > div._2xy_p._3XKXx > button";
  const cancelSearchClass =
    "#side > div._3gYev > div > div._1EUay > span > button";
  const searchContactInputClass =
    "#app > div > div > div._2QgSC > div._2Ts6i._3RGKj._318SY > span > div > span > div > div._1tRmd._3wQ5i.o7fBL > div._1EUay > div._2vDPL > div > div.to2l77zo.gfz4du6o.ag5g9lrv.bze30y65.kao4egtt.qh0vvdkp";
  const cancelContactSearchBtnClass =
    "#app > div > div > div._2QgSC > div._2Ts6i._3RGKj._318SY > span > div > span > div > div._1tRmd._3wQ5i.o7fBL > div._1EUay > span > button";
  const messageText = `Testing Whatsapp Message Send`;
  const contactList = [
    { number: "12211212" },
    { number: "123124124" },
    { number: "124241412" },
  ];
  for (const contact of contactList) {
    const isDuplicate = await prisma.whatsapp_messages_reports.findFirst({
      where: {
        phone_number: contact.number,
      },
    });
    if (isDuplicate) {
      await prisma.whatsapp_messages_reports.update({
        where: {
          id: isDuplicate.id,
        },
        data: {
          is_duplicate: true,
        },
      });
      continue;
    }
    await page.waitForSelector(inputClass);
    await delay(10, 22);
    const textToType = contact.number;
    for (const char of textToType) {
      await page.type(inputClass, char);
      await delay(0.3, 1);
    }
    await delay(5, 16);
    const chatclasspresent = await page.$(chatClass);
    const chatclass2present = await page.$(chatClass2);

    if (chatclasspresent || chatclass2present) {
      if (chatclasspresent) {
        await page.click(chatClass);
      } else {
        await page.click(chatClass2);
      }
      await page.waitForSelector(messageInputClass);
      await delay(3, 13);
      for (const char of messageText) {
        await page.type(messageInputClass, char);
        await delay(Math.random() * 1 + 0.3);
      }
      await page.waitForSelector(messageSendButton);
      await delay(3, 13);
      await page.click(messageSendButton);
      await prisma.whatsapp_messages_reports.create({
        data: {
          phone_number: contact.number,
          whatsapp_name: contact.number,
          is_send: true,
          has_whatsapp: true,
          created_at: new Date(),
        },
      });
    } else {
      await prisma.whatsapp_messages_reports.create({
        data: {
          phone_number: contact.number,
          whatsapp_name: contact.number,
          is_send: false,
          has_whatsapp: false,
          created_at: new Date(),
        },
      });
      console.log("Nothing Is Here");
    }
    await page.click(cancelSearchClass);
  }
};

enterToWA();
