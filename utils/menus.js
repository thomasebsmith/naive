const {Menu} = require("electron");
const constants = require("./constants");
const isProduction = require("./isProduction");

const setMenus = (sendAction) => {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open project",
          accelerator: "CommandOrControl+O",
          click: () => sendAction({type: "loadProject"})
        }
      ]
    },
    {role: "editMenu"},
    {
      label: "Window",
      submenu: [
        {
          label: "New Window",
          accelerator: "CommandOrControl+N",
          click: () => sendAction({type: "openWindow"})
        },
        {type: "separator"},
        {role: "minimize"},
        {role: "close"},
      ]
    }
  ];
  if (process.platform === 'darwin') {
    template.unshift({
      label: constants.appName,
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    });
  }
  if (!isProduction) {
    template.push({
      label: "Developer",
      submenu: [
        {role: "reload"},
        {role: "toggledevtools"},
        {
          label: "Force Windows to Show",
          click: () => sendAction({type: "forceShowWindows"})
        },
        {
          label: "Reset Preferences",
          click: () => sendAction({type: "resetPreferences"})
        }
      ]
    });
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

module.exports = setMenus;
