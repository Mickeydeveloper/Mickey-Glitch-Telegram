require('dotenv').config();
const config = require('./config');

global.tg_token = process.env.BOT_TOKEN || config.BOT_TOKEN;
global.pairing_code = process.env.PAIRING_CODE || 'MickeyGlitch'; // Default pairing code

// Initialize global variables
global.adminList = [];
global.premiumUsers = {};
global.deviceList = [];
global.userActivity = {};
global.whatsappAccounts = [];

// Load data from files
const fs = require('fs');
const path = require('path');

// Helper to load JSON safely
const loadJson = (filePath, defaultValue = {}) => {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
    }
    return defaultValue;
};

// Load persistent data
global.adminList = loadJson('./admins.json', []);
global.premiumUsers = loadJson('./premiumUsers.json', {});
global.deviceList = loadJson('./ListDevice.json', []);
global.userActivity = loadJson('./userActivity.json', {});

console.log('✅ Settings loaded successfully');