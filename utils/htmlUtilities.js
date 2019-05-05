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
