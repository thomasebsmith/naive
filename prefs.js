const electron = require("electron");
const path = require("path");
const fs = require("fs");

const getFileData = (filePath, defaultValues) => {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  }
  catch (e) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValues));
    return defaultValues;
  }
};

class UserDataFile {
  constructor(fileName, defaultValues) {
    const userDataPath = (electron.app ||
electron.remote.app).getPath("userData");
    this.path = path.join(userDataPath, fileName + ".json");
    this.data = getFileData(this.path, defaultValues);
  }
  get(key) {
    if (this.data[key] === undefined) {
      return;
    }
    return JSON.parse(JSON.stringify(this.data[key]));
  }
  set(key, value) {
    this.data[key] = value;
    fs.writeFileSync(this.path, JSON.stringify(this.data));
  }
}

const prefsFileName = "prefs";
const defaultPrefs = {
  style: {
    sidebarBackground: "#222222",
    sidebarButtonsBackground: "#333333",
    textColor: "#FFFFFF",
    content: {
      background: "#000000",
      font: "monospace",
      plain: {
        color: "#FFFFFF",
      },
      keyword: {
        color: "#4488FF",
        weight: "bold"
      },
      operator: {
        color: "#EEEEEE"
      },
      number: {
        color: "#44FF88"
      },
      string: {
        color: "#FF8844",
        style: "italic"
      },
      comment: {
        color: "#5555FF",
        style: "italic"
      },
      docComment: {
        color: "#8888FF",
        style: "italic"
      },
      invalid: {
        color: "#FF0000",
        weight: "bold",
        style: "italic"
      },
      identifier: {
        color: "#FFFFFF",
        style: "italic"
      },
      builtInValue: {
        color: "#44FFFF"
      }
    }
  }
};

class Prefs extends UserDataFile {
  constructor() {
    super(prefsFileName, defaultPrefs);
  }
}

module.exports = Prefs;
