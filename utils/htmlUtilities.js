exports.htmlFromArray = (array, parentEl = null) => {
  let el;
  const results = [];
  for (let i = 0; i < array.length; i++) {
    el = document.createElement("span");
    el.classList.add(array[i].className);
    el.textContent = array[i].text;
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
