// utils/contentAction.js
//
// This file provides a function that performs an editor action ("content
//  action"). The syntax of the function varies depending on the context in
//  which this module is imported. If the module is imported in an HTML page,
//  the syntax is contentAction(action, ...args). If the module is imported
//  elsewhere (i.e. in /main.js), the syntax is contentAction(win, action,
//  ...args).

// First, detect whether the current context is HTML and whether it is the
//  editor page itself.
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

// If it is the editor page, use the actions object directly.
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

// If it is another HTML page (i.e. views/main.html), post to contentEl's
//  contentWindow (i.e. the views/editor.html window).
else if (isHTML) {
  contentAction = (action, ...args) => {
    window.contentEl.contentWindow.postMessage(
      { action, args }, location.origin
    );
  };
}

// Otherwise, in a non-HTML environment, send the action to an appropriate
//  window which can then send it to the views/editor.html page within that
//  window.
else {
  contentAction = (win, action, ...args) => {
    sendWindowMessage(win, {
      action: action,
      args: args
    });
  };
};

module.exports = contentAction;
