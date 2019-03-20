// utils/htmlUtilities.js
//
// This file contains a utility for creating HTML from an array. If parentEl
//  is supplied, this HTML is created within parentEl and parentEl is returned.
//  Otherwise, a new HTML element is created to contain the result, which is
//  then returned.

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
