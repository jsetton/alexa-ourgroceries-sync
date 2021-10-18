'use strict';

module.exports = Object.freeze({
  // Alexa
  ALEXA_API_URL: process.env.ALEXA_API_URL || 'https://api.amazonalexa.com',
  ALEXA_SHOPPING_LIST: process.env.ALEXA_SHOPPING_LIST || 'Alexa shopping list',
  // OurGroceries
  OUR_GROCERIES_API_URL: process.env.OUR_GROCERIES_API_URL || 'https://www.ourgroceries.com',
  OUR_GROCERIES_USERNAME: process.env.OUR_GROCERIES_USERNAME,
  OUR_GROCERIES_PASSWORD: process.env.OUR_GROCERIES_PASSWORD,
  OUR_GROCERIES_SHOPPING_LIST: process.env.OUR_GROCERIES_SHOPPING_LIST,
  // Skill
  SKILL_ID: process.env.SKILL_ID,
  SKILL_CLIENT_ID: process.env.SKILL_CLIENT_ID,
  SKILL_CLIENT_SECRET: process.env.SKILL_CLIENT_SECRET,
  // AWS
  AWS_SCHEDULE_NAME: process.env.SCHEDULE_NAME || 'AlexaOurGroceriesSyncSchedule',
  AWS_TABLE_NAME: process.env.TABLE_NAME || 'AlexaOurGroceriesSyncSettings'
});
