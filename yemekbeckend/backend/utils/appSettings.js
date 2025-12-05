const fs = require('fs');
const path = require('path');

const settingsFilePath = path.join(__dirname, 'settings.json');

const defaultSettings = {
  orderStatusesActive: true,
};

const readSettings = () => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const settingsData = fs.readFileSync(settingsFilePath, 'utf8');
      return JSON.parse(settingsData);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error reading settings file:', error);
    return defaultSettings;
  }
};

const writeSettings = (settings) => {
  try {
    const currentSettings = readSettings();
    const newSettings = { ...currentSettings, ...settings };
    fs.writeFileSync(settingsFilePath, JSON.stringify(newSettings, null, 2));
    return newSettings;
  } catch (error) {
    console.error('Error writing settings file:', error);
    return null;
  }
};

module.exports = {
  readSettings,
  writeSettings,
};
