// Imports
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

// Global variables/constants
const titleEl = document.getElementsByTagName("title")[0];

let sidebarEl, sidebarButtonsEl, filesEl, contentEl;
let domLoaded = false;
let frameLoaded = false;
let completelyLoaded = false;
let windowID = null;

// setTitle(title) - Sets the editor's title to be title.
const setTitle = (title) => {
  titleEl.textContent = title;
};

const definedMessages = {
  // loadProject() - Shows an "Open File" dialog and then loads the project
  //  selected by the user.
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
  // id(id) - Notifies the main view that the window's ID is id.
  "id": (id) => {
    windowID = id;
    if (completelyLoaded) {
      sendMessageToMain({
        type: "window-loaded",
        data: windowID
      });
    }
  },
  // contentAction(data) - Performs a content action (i.e. an editor action)
  //  based on the given data.
  "contentAction": (data) => {
    contentAction(data.action, ...data.args);
  },
  // saveCurrentProjectFile() - Saves the current project file to disk.
  "saveCurrentProjectFile": () => {
    saveCurrentProjectFile();
  },
  // saveCurrentProjectFileAs(absolutePath) - Saves the current project file to
  //  disk at the specified absolute location on disk.
  "saveCurrentProjectFileAs": (absolutePath) => {
    saveCurrentProjectFileAs(absolutePath);
  },
  // saveCurrentProjectFileAsDialog() - Shows a dialog that allows the user to
  //  select where the current project file is saved to disk.
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
  },
  // shouldClose() - Tells the editor to close itself. The editor will check
  //  for unsaved changes and will warn the user if there are any. Otherwise,
  //  the editor will close itself via messaging back to /main.js.
  "shouldClose": () => {
    attemptToLeaveProject((shouldLeave) => {
      if (shouldLeave) {
        sendMessageToMain({
          type: "closeThisWindow",
          data: windowID
        });
      }
      else {
        sendMessageToMain({
          type: "promptToCloseThisWindow",
          data: windowID
        });
      }
    });
  }
};

// applyStyles(style) - Adds the given styles to the editor. Possible styles
//  are the sidebar background, sidebar button background, and text color. Also
//  sends style information to the editor.html page.
const applyStyles = (style) => {
  sidebarEl.style.background = style.sidebarBackground;
  sidebarButtonsEl.style.background = style.sidebarButtonsBackground;
  contentAction("setStyle", style.content);
  document.body.style.color = style.textColor;
};

let currentProject = null;
let fileIsLoaded = false;

// updateProjectFileCache(filePath, content) - Updates the file cache for the
//  current project with the given content for the file at filePath. The file
//  cache is used for caching the actual, saved-to-disk content of each
//  project file that has been opened. It is later used for comparison with
//  edited versions of the files to determine if there are unsaved changes.
const updateProjectFileCache = (filePath, content) => {
  if (currentProject.fileCache === undefined) {
    currentProject.fileCache = Object.create(null);
  }
  currentProject.fileCache[filePath] = content;
};

// updateProjectEditCache(filePath, content) - Updates the edit cache for the
//  current project with the given content for the file at filePath. The edit
//  cache is used for temporarily storing (usually unsaved) changes. It is
//  used for keeping multiple unsaved files open at once and for comparison
//  when determining if there are unsaved files.
const updateProjectEditCache = (filePath, content) => {
  if (currentProject.editCache === undefined) {
    currentProject.editCache = Object.create(null);
  }
  currentProject.editCache[filePath] = content;
};

// loadFileContent(filePath[, callback]) - Loads the file at the given filePath
//  in the editor. Caches content appropriately.
const loadFileContent = (filePath, callback = constants.noop) => {
  const onFileLeft = () => {
    const onFileRead = (err, content) => {
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
    };

    if (currentProject.editCache &&
        currentProject.editCache[filePath] !== undefined) {
      onFileRead(undefined, currentProject.editCache[filePath]);
    }
    else {
      fs.readFile(filePath, onFileRead);
    }
  };

  if (fileIsLoaded) {
    prepareToLeaveFile(onFileLeft);
  }
  else {
    onFileLeft();
    fileIsLoaded = true;
  }
};

// saveFileContent(filePath, text[, callback]) - Saves text to the file at the
//  given filePath. Updates caches appropriately.
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

// loadSidebarContent(project[, callback]) - Loads the sidebar, containing the
//  list of project files, into the DOM.
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

// storeProject() - Saves the current project to localStorage. Does not save
//  caches.
const storeProject = () => {
  localStorage.setItem("project", JSON.stringify({
    name: currentProject.name,
    path: currentProject.path,
    selectedRelativePath: currentProject.selectedRelativePath
  }));
};

// setProjectFile(relativePath) - Opens the file at relativePath within the
//  current project.
const setProjectFile = (relativePath) => {
  currentProject.selectedRelativePath = relativePath;
  storeProject();
  reloadFileContent();
};

// reloadFileContent(callback) - Reloads the currently selected file.
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

// loadProject(project[, callback]) - Loads the project within the given object
//  representation.
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

// prepareToLeaveFile([callback]) - Saves the current file's content to the edit
//  cache.
const prepareToLeaveFile = (callback = constants.noop) => {
  contentAction("get", addReplyListener((text) => {
    updateProjectEditCache(
      path.join(currentProject.path, currentProject.selectedRelativePath),
      text
    );
    callback();
  }));
};

// attemptToLeaveProject(callback) - Prepares for exiting the project. callback
//  is called with a boolean that is true iff there are unsaved project file
//  changes.
const attemptToLeaveProject = (callback) => {
  prepareToLeaveFile(() => {
    if (anyProjectFileIsModified()) {
      callback(false);
      return;
    }
    callback(true);
  });
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

const anyProjectFileIsModified = () => {
  for (let i in currentProject.editCache) {
    if (fileIsModified(i, currentProject.editCache[i])) {
      return true;
    }
  }
  return false;
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
