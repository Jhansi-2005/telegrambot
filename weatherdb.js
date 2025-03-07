const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const TelegramBot = require('node-telegram-bot-api');



const token = '8112663883:AAHCqMV_U3vDgd3NPTRiqT3_KsHmghHS68g';

const weatherApiKey = '42d167e30c27d691c19b2d78153e58a';


const bot = new TelegramBot(token, { polling: true });


const serviceAccount = require('./key.json');
initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();


bot.on('message', async (mg) => {
  const msg = mg.text.trim();
  const newMsg = msg.split(' ');

  if (newMsg.length < 2) {
    bot.sendMessage(mg.chat.id, "Invalid format! Use:\n- INSERT <key> <value>\n- GET <key>\n- WEATHER <city>");
    return;
  }

  const command = newMsg[0].toUpperCase();
  const param = newMsg.slice(1).join(' '); 
  if (command === 'INSERT') {
    
    const [key, ...valueParts] = newMsg.slice(1);
    if (!key || valueParts.length === 0) {
      bot.sendMessage(mg.chat.id, "Please provide a key and value: INSERT <key> <value>");
      return;
    }
    const value = valueParts.join(' ');
    try {
      await db.collection('personalData').add({
        key,
        dataValue: value,
        userID: mg.from.id,
      });
      bot.sendMessage(mg.chat.id, `✅ "${key}" stored successfully with value: "${value}"`);
    } catch (error) {
      bot.sendMessage(mg.chat.id, `❌ Error storing data: ${error.message}`);
    }
  } else if (command === 'GET') {
    try {
      const docs = await db.collection('personalData')
        .where('userID', '==', mg.from.id)
        .where('key', '==', param)
        .get();
      if (docs.empty) {
        bot.sendMessage(mg.chat.id, `⚠️ No data found for key: "${param}"`);
      } else {
        docs.forEach((doc) => {
          bot.sendMessage(mg.chat.id, `🔑 Key: ${doc.data().key}\n📄 Value: ${doc.data().dataValue}`);
        });
      }
    } catch (error) {
      bot.sendMessage(mg.chat.id, `❌ Error retrieving data: ${error.message}`);
    }
  } else if (command === 'WEATHER') {
    try {
      const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: param,
          appid: weatherApiKey,
          units: 'imperial',
        },
      });
      const data = response.data;
      const city = data.name;
      const country = data.sys.country;
      const temperature = data.main.temp;
      const description = data.weather[0].description;
      const weatherMessage = `🌤️ The current temperature in ${city}, ${country} is ${temperature}°F with ${description}.`;
      bot.sendMessage(mg.chat.id, weatherMessage);
    } catch (error) {
      bot.sendMessage(mg.chat.id, `❌ Error fetching weather for "${param}". Please check the city name.`);
    }
  } else {
    bot.sendMessage(mg.chat.id, "Invalid command! Use:\n- INSERT <key> <value>\n- GET <key>\n- WEATHER <city>");
  }
});
