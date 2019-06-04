class Style {
  constructor(color, weight, style, decoration) {
    this.color = color;
    this.weight = weight;
    this.style = style;
    this.decoration = decoration;
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
