const axios = require("axios");
const { CRM_API, BOT_INTERNAL_SECRET } = require("./config");

const api = axios.create({
    baseURL: CRM_API,
    timeout: 15000,
    headers: {
        "X-Bot-Secret": BOT_INTERNAL_SECRET
    }
});

module.exports = api;