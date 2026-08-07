require("dotenv").config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CRM_API: process.env.CRM_API,
    BOT_INTERNAL_SECRET: process.env.BOT_INTERNAL_SECRET,
    PORT: process.env.PORT || 3001
};