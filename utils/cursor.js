class Cursor {
  constructor(editingContext) {
    this.context = editingContext;
    this.element = null;
    this.identifier = null;
    this.position = null;
  }
  moveTo(position) {
    if (this.position === position) {
      return;
    }
    if (position < 0) {
      position = 0;
    }
    if (this.element !== null) {
      const justText =
        this.context.document.createTextNode(this.element.textContent);
      this.element.parentElement.replaceChild(justText, this.element);
    }
    this.identifier = this.context.atPosition(position, {
      allowEndOfFile: true
    });
    this.position = position;
    const token = this.identifier.token;
    const relativePosition = this.position - token.startIndex;
    const tokenElement = this.identifier.element;
    this.element = this.context.createElement("cursor", {
      text: token.text.charAt(relativePosition),
      isFinalCharacter: relativePosition === token.text.length - 1
    });

    tokenElement.textContent = token.text.substring(0, relativePosition) +
      token.text.substring(relativePosition + 1);

    const range = this.context.document.createRange();
    const node = tokenElement.textContent.length === 0 ? tokenElement : 
      tokenElement.firstChild;
    range.setStart(node, relativePosition);
    range.setEnd(node, relativePosition);
    range.insertNode(this.element);
  }
  moveBy(positionDifference) {
    return moveTo(this.position + positionDifference);
  }
}

class Selection {
  constructor(beginCursor, endCursor) {
    this.begin = beginCursor;
    this.end = endCursor;
  }
  moveRight(amount = 1) {
    this.end.moveBy(amount);
  }
  moveLeft(amount = 1) {
    this.end.moveBy(-amount);
  }
}

module.exports.Cursor = Cursor;
module.exports.Selection = Selection;
