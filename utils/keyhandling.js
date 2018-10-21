exports.handleKeys = (target, contentAction) => {
  target.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowLeft":
        contentAction("cursorLeft");
        break;
      case "ArrowRight":
        contentAction("cursorRight");
        break;
      case "Backspace":
      case "Delete":
        contentAction("removeBeforeCursor", 1);
        break;
      case "Enter":
        contentAction("insertAtCursor", "\n");
        break;
      case "Tab":
        contentAction("insertAtCursor", "\t");
        break;
      default:
        if (event.key.length === 1) {
          contentAction("insertAtCursor", event.key);
        }
    }
  });
};
