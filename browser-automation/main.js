const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cron = require("node-cron");

const API = axios.create({
  baseURL: "http://localhost:8000",
});

//   recipient: string;
//   text: string;
//   session_id: string;

let allowMessageSending = false;
const phoneNumber = process.env.PHONE_NUMBER;

let successCount = 0;

const delay = async (mintime, maxtime) => {
  const randomTime = Math.random() * (maxtime - mintime + 1) + mintime;
  await new Promise((resolve) => setTimeout(resolve, 1000 * randomTime));
};

const getContactList = async (session_id, country_code) => {
  try {
    const res = await API.get(`/get-contacts/${session_id}/${country_code}`);
    const contactList = res.data;

    const uniqueNumbersMap = new Map();
    contactList.forEach((contact) => {
      if (!uniqueNumbersMap.has(contact.phone)) {
        uniqueNumbersMap.set(contact.phone, contact.firstName);
      }
    });
    const uniqueCombinations = Array.from(uniqueNumbersMap.entries()).map(
      ([number, name]) => ({ number, name })
    );
    return uniqueCombinations;
  } catch (error) {
    console.error(error);
  }
};
const messageTextsArray = [
  "random text",
  "random text2"
];

const sendMessages = async () => {
  const numbersCount = 2;
  allowMessageSending = true;
  for (let i = 0; i < numbersCount; i++) {
  let i = 0;
  let messageText =
    "random text3";
  const contactList = await getContactList(i, "44");
  let contactIndex = i;
  for (const contact of contactList) {
    if (!allowMessageSending) {
      break;
    }
    messageText = messageTextsArray[contactIndex % messageTextsArray.length];
    const isDuplicate = await prisma.telegram_messages_reports.findFirst({
      where: {
        phone_number: contact.number,
      },
    });
    if (isDuplicate) {
      await prisma.telegram_messages_reports.update({
        where: {
          id: isDuplicate.id,
        },
        data: {
          is_duplicate: true,
          session_id: i,
        },
      });
      continue;
    }
    await delay(100, 200);
    try {
      const requestBody = {
        recipient: contact.number,
        text: messageText,
        session_id: `${i}`,
      };
      await API.post("/send-message", requestBody)
        .then(async (res) => {
          await prisma.telegram_messages_reports.create({
            data: {
              phone_number: contact.number,
              first_name: contact.name,
              created_at: new Date(),
              is_send: true,
              session_id: i,
            },
          });
          console.log("Message Send To: " + contact.number);
          successCount++;
        })
        .catch(async (error) => {
          await prisma.telegram_messages_reports.create({
            data: {
              phone_number: contact.number,
              first_name: contact.name,
              created_at: new Date(),
              is_send: false,
              error_message:
                error.response.data.detail ||
                error.response.data ||
                error.data.detail ||
                "",
              session_id: i,
            },
          });
          console.log(error);
        })
        .finally(() => {
          contactIndex++;
        });
    } catch (error) {
      if (error.status === 409) {
        const reqBody = {
          recipient: phoneNumber,
          text: `Telegramma Dagvbloka da gacherda gagzavnebi \n Sul Gagzavna: ${successCount}`,
          session_id: 0,
        };
        await API.post("/send-message", reqBody);
        break;
      }
    }
  }
  }
};
const stopSendingMessages = async () => {
  allowMessageSending = false;
};
cron.schedule("0 22 * * *", async () => {
  await getContactList(0, 995);
  console.log("Start Sending Messages on 22:00");
  const reqBody = {
    recipient: phoneNumber,
    text: "SMS gagzavnebi daiwyo",
    session_id: 0,
  };
  await API.post("/send-message", reqBody);
  await sendMessages();
});

cron.schedule("0 1 * * *", async () => {
  console.log("Stop Sending Messages on 01:00");
  const reqBody = {
    recipient: phoneNumber,
    text: `SMS gagzavnebi morcha \n Sul Gagzavna: ${successCount}`,
    session_id: 0,
  };
  await API.post("/send-message", reqBody);
  await stopSendingMessages();
});
