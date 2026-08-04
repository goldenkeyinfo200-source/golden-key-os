require("dotenv").config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CRM_API: process.env.CRM_API,
    PORT: process.env.PORT || 3001
};