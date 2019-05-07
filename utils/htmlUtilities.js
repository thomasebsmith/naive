// utils/htmlUtilities.js
//
// This file contains a utility for creating HTMl from an array and a simple
//  ElementStream implementation and interface.

// htmlFromArray - If parentEl is supplied, the new HTML is created within
//  parentEl and parentEl is returned.  Otherwise, a new HTML element is created
//  to contain the result, which is then returned.
exports.htmlFromArray = (array, parentEl = null) => {
  let el;
  const results = [];
  for (let i = 0; i < array.length; i++) {
    el = document.createElement("span");
    el.classList.add(array[i].className);
    el.textContent = array[i].text;
    if (array[i].data) {
      for (let key in array[i].data) {
        if (array[i].data.hasOwnProperty(key)) {
          el.dataset[key] = array[i].data[key];
        }
      }
    }
    if (parentEl !== null) {
      parentEl.appendChild(el);
    }
    else {
      results.push(el);
    }
  }
  if (parentEl === null) {
    return results;
  }
  return parentEl;
};

// ElementStream(elementList) - Creates a simple stream based on the given
//  list of elements. ElementStreams must provide the hasNext, next, and peek
//  methods at a minimum.
class ElementStream {
  constructor(elementList) {
    this.elementList = elementList;
    this.index = 0;
  }
  get hasNext() { return this.index < this.elementList.length; }
  next() { return this.elementList[this.index++]; }
  peek() { return this.elementList[this.index]; }
};
exports.ElementStream = ElementStream;

class NestedElementStream extends ElementStream {
  constructor(parentElement) {
    this.parentStream = new ElementStream(parentElement.children);
    if (this.parentStream.hasNext) {
      this.childStream = new ElementStream(parentElement.peek().children);
    }
    else {
      this.childStream = null;
    }
  }
  get hasNext() {
    return this.childStream !== null;
  }
  next() {
    const toReturn = this.childStream.next();
    if (!this.childStream.hasNext) {
      if (this.parentStream.hasNext) {
        this.childStream = new ElementStream(this.parentStream.next());
      }
      else {
        this.childStream = null;
      }
    }
    return toReturn;
  }
  peek() {
    return this.childStream.peek();
  }
};
exports.NestedElementStream = NestedElementStream;

class HighlightedStream {
  constructor(parentElement) {
    this.nestedStream = NestedElementStream(parentElement);
    this.peeked = null;
  }
  get hasNext() {
    return this.peeked !== null || this.nestedStream.hasNext;
  }
  next() {
    if (this.peeked !== null) {
      const toReturn = this.peeked;
      this.peeked = null;
      return toReturn;
    }
    const nextElement = this.nestedStream.next();
    const tokenTypeName = nextElement.dataset.tokenTypeName;
    const startIndex = nextElement.dataset.startIndex;
    let text = nextElement.textContent;
    if (this.nestedStream.peek().dataset.isContinuation) {
      text += this.nestedStream.next().textContent;
    }
    return {
      tokenTypeName,
      startIndex,
      text
    };
  }
  peek() {
    if (this.peeked === null) {
      this.peeked = this.next();
    }
    return this.peeked;
  }
};
