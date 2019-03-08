const {ipcRenderer} = require("electron");

const fs = require("fs");
const path = require("path");

const constants = require("../utils/constants");
const prefs = new (require("../utils/prefs"))();
const getMimeType = require("../utils/getMimeType");
const {
  sendMessageToMain,
  sendAsyncMessageToMain
} = require("../utils/rendererMessaging");
const contentAction = require("../utils/contentAction");
const { handleKeys } = require("../utils/keyhandling");

const titleEl = document.getElementsByTagName("title")[0];

let sidebarEl, sidebarButtonsEl, filesEl, contentEl;
let domLoaded = false;
let frameLoaded = false;
let completelyLoaded = false;
let windowID = null;

const setTitle = (title) => {
  titleEl.textContent = title;
};

const definedMessages = {
  "loadProject": () => {
    sendAsyncMessageToMain({
      type: "showOpenDialog",
      data: {
        properties: ["openDirectory", "openFile", "createDirectory"]
      }
    }, (projectPath) => {
      projectPath = projectPath[0];
      fs.stat(projectPath, (err, stats) => {
        if (err) {
          console.error("There was an error loading the project with path ", projectPath, ": ", err);
        }
        else if (stats.isDirectory()){
          loadProject({
            name: path.basename(projectPath),
            path: projectPath,
            selectedRelativePath: null
          });
        }
        else {
          loadProject({
            name: path.basename(path.dirname(projectPath)),
            path: path.dirname(projectPath),
            selectedRelativePath: path.basename(projectPath)
          });
        }
      });
    });
  },
  "id": (id) => {
    windowID = id;
    if (completelyLoaded) {
      sendMessageToMain({
        type: "window-loaded",
        data: windowID
      });
    }
  },
  "contentAction": (data) => {
    contentAction(data.action, ...data.args);
  },
  "saveCurrentProjectFile": () => {
    saveCurrentProjectFile();
  },
  "saveCurrentProjectFileAs": (absolutePath) => {
    saveCurrentProjectFileAs(absolutePath);
  },
  "saveCurrentProjectFileAsDialog": () => {
    sendAsyncMessageToMain({
      type: "showSaveDialog",
      data: {
        defaultPath: path.join(currentProject.path,
                               currentProject.selectedRelativePath),
        title: "Save As"
      }
    }, (absolutePath) => {
      if (absolutePath !== undefined) {
        saveCurrentProjectFileAs(absolutePath);
      }
    });
  }
};

const applyStyles = (style) => {
  sidebarEl.style.background = style.sidebarBackground;
  sidebarButtonsEl.style.background = style.sidebarButtonsBackground;
  contentAction("setStyle", style.content);
  document.body.style.color = style.textColor;
};

let currentProject = null;

const updateProjectFileCache = (filePath, content) => {
  if (currentProject.fileCache === undefined) {
    currentProject.fileCache = {};
  }
  currentProject.fileCache[filePath] = content;
};

const updateProjectEditCache = (filePath, content) => {
  if (currentProject.editCache === undefined) {
    currentProject.editCache = {};
  }
  currentProject.editCache[filePath] = content;
};

const loadFileContent = (filePath, callback = constants.noop) => {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      contentAction("setLanguage", "text/x-editor-error");
      contentAction("set", "There was an error loading the file at " +
        filePath);
      console.warn("Could not load file ", filePath, "(error: ", err, ")");
    }
    else {
      updateProjectFileCache(filePath, content.toString());
      contentAction("setLanguage",
        getMimeType(path.parse(filePath).ext.substring(1)));
      contentAction("set", content.toString());
    }
    callback(err);
  });
};

const saveFileContent = (filePath, text, callback = constants.noop) => {
  fs.writeFile(filePath, text, { encoding: "utf8" }, (err) => {
    if (err) {
      console.warn("Could not save file ", filePath, "(err: ", err, ")");
    }
    else {
      updateProjectFileCache(filePath, text);
    }
    callback(err);
  });
};

const loadSidebarContent = (project, callback = noop) => {
  const projectPath = project.path;
  const projectName = project.name;
  fs.readdir(projectPath, (err, projectFiles) => {
    if (err) {
      contentAction("set", "There was an error loading the file at " + filePath);
      contentAction("setLanguage", "text/x-editor-error");
      console.warn("Could not load file ", filePath, "(error: ", e, ")");
    }
    else {
      filesEl.textContent = "";
      let el = document.createElement("h6");
      el.textContent = projectName + " — Files";
      filesEl.appendChild(el);
      for (let f of projectFiles) {
        el = document.createElement("div");
        el.classList.add("fileName");
        el.textContent = f;
        el.addEventListener("click", () => setProjectFile(f));
        filesEl.appendChild(el);
      }
    }
    callback();
  });
};

const storeProject = () => {
  localStorage.setItem("project", JSON.stringify(currentProject));
};

const setProjectFile = (relativePath) => {
  currentProject.selectedRelativePath = relativePath;
  storeProject();
  reloadFileContent();
};

const reloadFileContent = (callback) => {
  const selectedEl = document.querySelector(".fileName.selected");
  if (selectedEl !== null) {
    selectedEl.classList.remove("selected");
  }
  setTitle(constants.appName + " — " + currentProject.name + " — " + currentProject.selectedRelativePath);
  if (currentProject.selectedRelativePath === null) {
    contentAction("set", "No file is open");
    contentAction("setLanguage", "text/x-editor-error");
  }
  else {
    let el;
    for (let i = 0; i < filesEl.children.length; i++) {
      el = filesEl.children[i];
      if (el.textContent === currentProject.selectedRelativePath &&
          el.classList.contains("fileName")) {
        el.classList.add("selected");
      }
    }
    loadFileContent(path.join(currentProject.path, currentProject.selectedRelativePath), callback);
  }
};

const loadProject = (project, callback = constants.noop) => {
  currentProject = project;
  storeProject();
  if (currentProject === null) {
    contentAction("set", "No project exists");
    contentAction("setLanguage", "text/x-editor-error");
  }
  else {
    loadSidebarContent(project, () => reloadFileContent(callback));
  }
};

const prepareToLeaveFile = () => {
  contentAction("get", addReplyListener((text) => {
    updateProjectEditCache(
      path.join(currentProject.path, currentProject.selectedRelativePath)
    );
  }));
};

const saveCurrentProjectFileAs = (absolutePath, callback = constants.noop) => {
  contentAction("get", addReplyListener((text) => {
    saveFileContent(absolutePath, text, callback);
  }));
};

const saveCurrentProjectFile = (callback = constants.noop) => {
  saveCurrentProjectFileAs(
    path.join(currentProject.path, currentProject.selectedRelativePath),
    callback
  );
};

const fileIsModified = (absolutePath, editorText) => {
  const cacheResult = currentProject.fileCache[absolutePath];
  return cacheResult !== editorText;
};

const onContentLoaded = () => {
  applyStyles(prefs.get("style"));
  loadProject(JSON.parse(localStorage.getItem("project")), () => {
    completelyLoaded = true;
    if (windowID !== null) {
      sendMessageToMain({
        type: "window-loaded",
        data: windowID
      });
    }
  });
};

ipcRenderer.on("message", (event, data) => {
  if (definedMessages.hasOwnProperty(data.type)) {
    definedMessages[data.type](data.data);
  }
  else {
    console.error("Invalid message", data);
  }
});

const replyListeners = [];
const addReplyListener = (func) => {
  return replyListeners.push(func) - 1;
};

window.addEventListener("message", (event) => {
  if (event.origin === location.origin) {
    if (event.data === constants.contentLoaded) {
      frameLoaded = true;
      if (domLoaded) {
        onContentLoaded();
      }
    }
    else if (typeof event.data === "object" &&
             event.data.type === constants.reply) {
      replyListeners[event.data.replyID](event.data.result);
    }
  }
});

handleKeys(window, contentAction);

document.addEventListener("DOMContentLoaded", () => {
  sidebarEl = document.getElementById("sidebar");
  sidebarButtonsEl = document.getElementById("sidebar-buttons");
  filesEl = document.getElementById("files");
  contentEl = document.getElementById("content");
  domLoaded = true;
  if (frameLoaded) {
    onContentLoaded();
  }
});
