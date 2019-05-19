// utils/keyhandling.js
//
// Provides a function for responding to key events. This function, given an
//  event target, listens for keyup events on that target. When they occur,
//  it dispatches an appropriate editor action via the contentAction function
//  provided as an argument.
exports.handleKeys = (target, contentAction) => {
  target.addEventListener("keyup", (event) => {
    switch (event.key) {
      // Cursor movement
      case "ArrowLeft":
        contentAction("cursorLeft");
        break;
      case "ArrowRight":
        contentAction("cursorRight");
        break;
      case "ArrowDown":
        contentAction("cursorDown");
        break;
      case "ArrowUp":
        contentAction("cursorUp");
        break;
      // Deleting
      case "Backspace":
      case "Delete":
        contentAction("removeBeforeCursor", 1);
        break;
      // Special whitespace characters
      case "Enter":
        contentAction("insertAtCursor", "\n");
        break;
      case "Tab":
        contentAction("insertAtCursor", "\t");
        break;
      // Normal characters
      default:
        if (event.key.length === 1) {
          contentAction("insertAtCursor", event.key);
        }
    }
  });
};
