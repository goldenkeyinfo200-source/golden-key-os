const axios = require("axios");
const { CRM_API } = require("./config");

const api = axios.create({
    baseURL: CRM_API,
    timeout: 15000
});

module.exports = api;