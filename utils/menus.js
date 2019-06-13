// utils/menus.js
//
// Provides the application menus. Clients of this file only need to supply
//  a contentAction function that actually performs the actions.

// Imports
const {Menu} = require("electron");
const constants = require("./constants");
const isProduction = require("./isProduction");

// setMenus(sendAction) - Sets the application's menus to include all the
//  appropriate actions with appropriate keyboard shortcuts. When an action is
//  taken, the sendAction function is called.
const setMenus = (sendAction) => {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open project...",
          accelerator: "CommandOrControl+O",
          click: () => sendAction({type: "loadProject"})
        },
        {
          label: "Save",
          accelerator: "CommandOrControl+S",
          click: () => sendAction({type: "saveCurrentProjectFile"})
        },
        {
          label: "Save As...",
          accelerator: "CommandOrControl+Shift+S",
          click: () => sendAction({type: "saveCurrentProjectFileAsDialog"})
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
  // On MacOS, a menu with the app name and basic MacOS app actions is
  //  available.
  if (process.platform === "darwin") {
    template.unshift({
      label: constants.appName,
      submenu: [
        {role: "about"},
        {type: "separator"},
        {
          label: "Preferences...",
          accelerator: "CommandOrControl+,",
          click: () => sendAction({type: "openPreferences"})
        },
        {type: "separator"},
        {role: "services", submenu: []},
        {type: "separator"},
        {role: "hide"},
        {role: "hideothers"},
        {role: "unhide"},
        {type: "separator"},
        {role: "quit"}
      ]
    });
  }
  else {
    // When not on MacOS, the preferences window can be opened from the
    //  "Window" menu.
    template[template.length - 1].submenu.push(
      {type: "separator"},
      {
        label: "Preferences...",
        accelerator: "CommandOrControl+,",
        click: () => sendAction({type: "openPreferences"})
      }
    );
  }
  // A "Developer" menu is available if not in production.
  if (!isProduction) {
    template.push({
      label: "Developer",
      submenu: [
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
