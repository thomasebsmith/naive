const fs = require("fs");
const path = require("path");

const constants = require("../constants");
const prefs = new (require("../prefs"))();
const getMimeType = require("../getMimeType");

const titleEl = document.getElementsByTagName("title")[0];

let sidebarEl, sidebarButtonsEl, filesEl, contentEl;
let domLoaded = false;
let frameLoaded = false;

const setTitle = (title) => {
  titleEl.textContent = title;
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
      contentAction("set", "There was an error loading the file at " + filePath);
      contentAction("setLanguage", "text/x-editor-error");
      console.warn("Could not load file ", filePath, "(error: ", err, ")");
    }
    else {
      contentAction("set", content.toString());
      contentAction("setLanguage", getMimeType(path.parse(filePath).ext.substring(1)));
    }
  });
};

const loadSidebarContent = (project) => {
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
        el = document.createElement("span");
        el.classList.add("fileName");
        el.textContent = f;
        filesEl.appendChild(el);
      }
    }
  });
};


const loadProject = (project) => {
  currentProject = project;
  localStorage.setItem("project", JSON.stringify(project));
  if (currentProject === null) {
    contentAction("set", "No project exists");
    contentAction("setLanguage", "text/x-editor-error");
  }
  else {
    setTitle(constants.appName + " — " + project.name + " — " +
project.selectedRelativePath);
    loadFileContent(path.join(project.path, project.selectedRelativePath));
    loadSidebarContent(project);
  }
};

const onContentLoaded = () => {
  applyStyles(prefs.get("style"));
  loadProject(JSON.parse(localStorage.getItem("project")));
};

window.addEventListener("message", (event) => {
  if (event.origin === location.origin && event.data === "loaded") {
    frameLoaded = true;
    if (domLoaded) {
      onContentLoaded();
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


