const { app } = require("electron");

module.exports.setup = function() {
  app.setAboutPanelOptions({
    applicationName: "Naive",
    applicationVersion: "0.1.0",
    copyright: "Copyright © 2018-2019 Thomas Smith",
    version: "Build 0",
    website: "https://github.com/thomasebsmith/naive"
  });
};
