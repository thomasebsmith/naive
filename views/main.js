const {ipcRenderer} = require("electron");

const fs = require("fs");
const path = require("path");

const constants = require("../utils/constants");
const prefs = new (require("../utils/prefs"))();
const getMimeType = require("../utils/getMimeType");
const {sendMessageToMain} = require("../utils/rendererMessaging");

const titleEl = document.getElementsByTagName("title")[0];

let sidebarEl, sidebarButtonsEl, filesEl, contentEl;
let domLoaded = false;
let frameLoaded = false;

const setTitle = (title) => {
  titleEl.textContent = title;
};

const definedMessages = {
  "loadProject": () => {
    sendMessageToMain({
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
  }
};

const contentAction = (action, ...args) => {
  contentEl.contentWindow.postMessage({ action, args }, location.origin);
};

const applyStyles = (style) => {
  sidebarEl.style.background = style.sidebarBackground;
  sidebarButtonsEl.style.background = style.sidebarButtonsBackground;
  contentAction("setStyle", style.content);
  document.body.style.color = style.textColor;
};

let currentProject = null;

const loadFileContent = (filePath) => {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      contentAction("setLanguage", "text/x-editor-error");
      contentAction("set", "There was an error loading the file at " + filePath);
      console.warn("Could not load file ", filePath, "(error: ", err, ")");
    }
    else {
      contentAction("setLanguage", getMimeType(path.parse(filePath).ext.substring(1)));
      contentAction("set", content.toString());
    }
  });
};

const loadSidebarContent = (project, callback) => {
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

const reloadFileContent = () => {
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
    loadFileContent(path.join(currentProject.path, currentProject.selectedRelativePath));
  }
};

const loadProject = (project) => {
  currentProject = project;
  storeProject();
  if (currentProject === null) {
    contentAction("set", "No project exists");
    contentAction("setLanguage", "text/x-editor-error");
  }
  else {
    loadSidebarContent(project, () => reloadFileContent());
  }
};

const onContentLoaded = () => {
  applyStyles(prefs.get("style"));
  loadProject(JSON.parse(localStorage.getItem("project")));
};

ipcRenderer.on("message", (event, data) => {
  if (definedMessages.hasOwnProperty(data.type)) {
    definedMessages[data.type](data.data);
  }
  else {
    console.error("Invalid message", data);
  }
});

window.addEventListener("message", (event) => {
  if (event.origin === location.origin) {
    if (event.data === constants.contentLoaded) {
      frameLoaded = true;
      if (domLoaded) {
        onContentLoaded();
      }
    }
  }
});

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
