function Metrics() {
    this.canvas = document.createElement("canvas")
}

Metrics.prototype.getTextWidth = function(text, font) {
    var context = this.canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);

    return metrics.width;
}