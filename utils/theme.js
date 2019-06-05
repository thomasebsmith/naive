class Style {
  constructor(name, color, weight, style, decoration) {
    this.name = name;
    this.color = color;
    this.weight = weight;
    this.style = style;
    this.decoration = decoration;
  }
  addToDocument(document) {
    document.body.style.setProperty("--user-" + this.name + "-color",
      this.color);
    document.body.style.setProperty("--user-" + this.name + "-weight",
      this.weight);
    document.body.style.setProperty("--user-" + this.name + "-style",
      this.style);
    document.body.style.setProperty("--user-" + this.name + "-decoration",
      this.decoration);
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
