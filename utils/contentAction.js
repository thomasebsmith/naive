let isHTML = true;
try {
  window && window.document;
}
catch (e) {
  isHTML = false;
}
let isEditor = false;
if (isHTML && window.isEditor) {
  isEditor = true;
}

let contentAction;
if (isHTML && isEditor) {
  let win = editorWindow.requireProps;
  contentAction = (action, ...args) =>  {
    if (win.actions.hasOwnProperty(action)) {
      return win.actions[action].apply(win.actions, args);
    }
    else {
      console.error("Invalid editor content action ", action, " with arguments",
        args);
    }
  };
}
else if (isHTML) {
  contentAction = (action, ...args) => {
    contentEl.contentWindow.postMessage({ action, args }, location.origin);
  };
}
else {
  contentAction = (win, action, ...args) => {
    sendWindowMessage(win, {
      action: action,
      args: args
    });
  };
};

module.exports = contentAction;
