exports.htmlFromArray = (array, parentEl = document.createElement("div")) => {
  let el;
  for (let i = 0; i < array.length; i++) {
    el = document.createElement("span");
    el.classList.add(array[i].className);
    el.textContent = array[i].text;
    parentEl.appendChild(el);
  }
  return parentEl;
};
