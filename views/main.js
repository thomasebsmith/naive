// views/main.js
//
// This file provides the JavaScript message handling and interaction logic for
//  the UI around the editor. It also sends messages to /main.js and
//  views/editor.js as necessary.

// Imports
const { ipcRenderer, remote } = require("electron");

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
    // First, show the open dialog (which is triggered by sending a message to
    //  main).
    sendAsyncMessageToMain({
      type: "showOpenDialog",
      data: {
        properties: ["openDirectory", "openFile", "createDirectory"]
      }
    }, (projectPath) => {
      if (!projectPath) {
        // If no project path was selected (the dialog was canceled), don't
        //  load any projects.
        return;
      }

      // Once a project path is selected in the dialog, use it to load the
      //  project.
      projectPath = projectPath[0];
      // Check that the project location exists.
      fs.stat(projectPath, (err, stats) => {
        if (err) {
          console.error("There was an error loading the project with path ",
            projectPath, ": ", err);
        }
        else if (stats.isDirectory()){
          // If the selected path is a directory, open the project in that
          //  directory.
          loadProject({
            name: path.basename(projectPath),
            path: projectPath,
            selectedRelativePath: null
          });
        }
        else {
          // If the selected path is not a directory, open the project in the
          //  path's parent directory.
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

// getDefaultProject() - Returns the default project, which involves the
//  the built-in Naive intro files.
const getDefaultProject = () => {
  return {
    name: "Welcome to Naive",
    path: path.join(remote.app.getAppPath(), "welcome"),
    selectedRelativePath: "index.md"
  };
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

  onFileLeft();
  fileIsLoaded = true;
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
      contentAction("set",
        "There was an error loading the file at " + filePath);
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
const setProjectFile = (relativePath, callback = constants.noop) => {
  const onFileLeft = () => {
    currentProject.selectedRelativePath = relativePath;
    storeProject();
    reloadFileContent();
  };
  if (fileIsLoaded) {
    prepareToLeaveFile(onFileLeft);
  }
};

// reloadFileContent(callback) - Reloads the currently selected file.
const reloadFileContent = (callback) => {
  const selectedEl = document.querySelector(".fileName.selected");
  if (selectedEl !== null) {
    selectedEl.classList.remove("selected");
  }
  setTitle(constants.appName + " — " + currentProject.name +
    " — " + currentProject.selectedRelativePath);
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
    loadFileContent(
      path.join(currentProject.path, currentProject.selectedRelativePath),
      callback
    );
  }
};

// loadProject(project[, callback]) - Loads the project within the given object
//  representation.
const loadProject = (project, callback = constants.noop) => {
  currentProject = project;
  if (currentProject === null) {
    currentProject = project = getDefaultProject();
  }
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

// saveCurrentProjectFileAs(absolutePath[, callback) - Saves the current project
//  file at the given absolute location.
const saveCurrentProjectFileAs = (absolutePath, callback = constants.noop) => {
  contentAction("get", addReplyListener((text) => {
    saveFileContent(absolutePath, text, callback);
  }));
};

// saveCurrentProjectFile([callback]) - Saves the current project file at its
//  existing location.
const saveCurrentProjectFile = (callback = constants.noop) => {
  saveCurrentProjectFileAs(
    path.join(currentProject.path, currentProject.selectedRelativePath),
    callback
  );
};

// fileIsModified(absolutePath, editorText) - Checks the file cache to see if
//  the given editorText differs from what is actually on disk.
const fileIsModified = (absolutePath, editorText) => {
  const cacheResult = currentProject.fileCache[absolutePath];
  return cacheResult !== editorText;
};

// anyProjectFileIsModified() - Returns whether any file in the edit cache is
//  different from the file cache (i.e. whether any file has been modified).
const anyProjectFileIsModified = () => {
  for (let i in currentProject.editCache) {
    if (fileIsModified(i, currentProject.editCache[i])) {
      return true;
    }
  }
  return false;
};

// onContentLoaded() - Applies styles, loads the project, and finally sends a
//  callback to /main.js indicating that the window has loaded.
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

// Messages are handled by calling definedMessages[msg.type](msg.data) for some
// given message data msg.
ipcRenderer.on(constants.message, (event, data) => {
  if (definedMessages.hasOwnProperty(data.type)) {
    definedMessages[data.type](data.data);
  }
  else {
    console.error("Invalid message", data);
  }
});

// replyListeners for messages to the window can automatically be added by
//  using the addReplyListener(func) function which will return a replyID.
//  Note that replyListeners is only cleared when all reply listeners have been
//  called.
let replyListeners = [];
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
      replyListeners[event.data.replyID] = null;
      for (let i = 0; i < replyListeners.length; i++) {
        if (replyListeners[i] !== null) {
          return;
        }
      }
      replyListeners = [];
    }
  }
});

// Add triggers for backspace, enter, etc. in which messages are sent to the
//  editor.
handleKeys(window, contentAction);

// When the DOM is loaded, obtain references to necessary HTML elements and
//  finish loading content if the frame (editor.html) has loaded.
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
