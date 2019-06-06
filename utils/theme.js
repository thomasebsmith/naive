class Style {
  constructor(property, value) {
    this.property = property + "";
    this.value = value + "";
  }
  addToDocument(document, prefix = "") {
    document.body.style.setProperty("--user-" + this.property, this.value);
  }
};

class Theme {
  constructor(defaultStyle) {
    this.defaultStyle = defaultStyle;
    this.styles = Object.create(null);
  }
  getStyle(name) {
    if (Object.prototype.hasOwnProperty.call(this.styles, name)) {
      return this.styles[name];
    }
    return this.defaultStyle;
  }
  setStyle(name, value) {
    this.styles[name] = value;
    return this;
  }
};
Theme.fromNestedObject = (nestedObject, defaultStyle, prefix = "") => {
  const theme = new Theme(defaultStyle);
  for (let i in nestedObject) {
    if (Object.prototype.hasOwnProperty.call(nestedObject, i)) {
      if (typeof nestedObject[i] === "object") {
        const nestedTheme = Theme.fromNestedObject(
          nestedObject[i],
          defaultStyle,
          prefix + "-" + i
        );
        for (let j in nestedTheme.styles) {
          theme.setStyle(j, nestedTheme.styles[j]);
        }
      }
      else {
        theme.setStyle(i, new Style(prefix + i, nestedObject[i]);
      }
    }
  }
};
