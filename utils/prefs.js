// prefs.js
//
// This file provides utilities for getting the current and default user
//  preferences.

// Imports
const electron = require("electron");
const path = require("path");
const fs = require("fs");

// resetFile(filePath, defaultValues) - Writes the JSON stringified version
//  of defaultValues to the file at filePath.
const resetFile = (filePath, defaultValues) => {
  fs.writeFileSync(filePath, JSON.stringify(defaultValues));
};

// getFileData(filePath, defaultValues) - If the file at filePath exists,
//  returns that files content parsed as JSON. If not, or if there is an error
//  parsing JSON, writes defaultValues to the file and returns defaultValues.
const getFileData = (filePath, defaultValues) => {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  }
  catch (e) {
    resetFile(filePath, defaultValues);
    return defaultValues;
  }
};

// UserDataFile - Represents a preferences or other user data file.
class UserDataFile {
  // constructor(fileName, defaultValues) - Creates a UserDataFile that will
  //  read from and write to fileName (relative to the electron userData
  //  directory). The default values are specified in defaultValues.
  constructor(fileName, defaultValues) {
    const userDataPath = (electron.app ||
      electron.remote.app).getPath("userData");
    this.defaultValues = defaultValues;
    this.path = path.join(userDataPath, fileName + ".json");
    this.data = getFileData(this.path, this.defaultValues);
  }

  // get(key) - Returns the user data entry with name "key".
  get(key) {
    if (this.data[key] === undefined) {
      return;
    }
    return JSON.parse(JSON.stringify(this.data[key]));
  }

  // set(key, value) - Sets the user data entry with name "key" to "value".
  //  Updates the preferences file accordingly.
  set(key, value) {
    this.data[key] = value;
    fs.writeFileSync(this.path, JSON.stringify(this.data));
  }

  // reset() - Resets the user data file to its default.
  reset() {
    resetFile(this.path, this.defaultValues);
  }
}

// Constants for Naive prefs.
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

// Prefs - Represents the Naive preferences user data file.
class Prefs extends UserDataFile {
  constructor() {
    super(prefsFileName, defaultPrefs);
  }
}

module.exports = Prefs;
