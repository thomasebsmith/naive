const electron = require("electron");
const path = require("path");
const fs = require("fs");

const resetFile = (filePath, defaultValues) => {
  fs.writeFileSync(filePath, JSON.stringify(defaultValues));
};

const getFileData = (filePath, defaultValues) => {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  }
  catch (e) {
    resetFile(filePath, defaultValues);
    return defaultValues;
  }
};

class UserDataFile {
  constructor(fileName, defaultValues) {
    const userDataPath = (electron.app ||
electron.remote.app).getPath("userData");
    this.defaultValues = defaultValues;
    this.path = path.join(userDataPath, fileName + ".json");
    this.data = getFileData(this.path, this.defaultValues);
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
  reset() {
    resetFile(this.path, this.defaultValues);
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
      selection: {
        background: "#777777"
      },
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
