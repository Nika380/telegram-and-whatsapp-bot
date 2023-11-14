const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API = axios.create({
  baseURL: "http://localhost:8000",
});

//   recipient: string;
//   text: string;
//   session_id: string;

const delay = async (time) => {
  await new Promise((resolve) => setTimeout(resolve, 1000 * time));
};

const sendMessage = async () => {
  const numbersCount = 2;
  const contactList = [{ number: "+123456789" }];
  const messageText = "Testing Telegram Number Changes";
  for (let i = 0; i < numbersCount; i++) {
    for (const contact of contactList) {
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
          },
        });
        continue;
      }
      await delay(10);
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
              },
            });
            console.log("Message Send To: " + contact.number);
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
              },
            });
            console.log(error);
          });
      } catch (error) {
        if (error.status === 409) {
          break;
        }
      }
    }
  }
};
sendMessage();
