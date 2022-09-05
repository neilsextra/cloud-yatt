var THEME_REGION_BOUNDARY_WIDTH = 4;
var THEME_BOUNDARY_LINE_COLOR = "#1a1a1a";
var THEME_BOUNDARY_FILL_COLOR = "#aaeeff";
var THEME_SEL_REGION_FILL_COLOR = "#808080";
var THEME_SEL_REGION_FILL_BOUNDARY_COLOR = "#000000";
var THEME_SEL_REGION_OPACITY = 0.5;
var THEME_MESSAGE_TIMEOUT_MS = 6000;
var THEME_ATTRIBUTE_VALUE_FONT = '10pt Arial';
var THEME_CONTROL_POINT_COLOR = '#ff0000';

var LINE_WIDTH = 4;
var SELECTED_OPACITY = 0.3;
var BOUNDARY_FILL_COLOR_ANNOTATED = "#f2f2f2";
var BOUNDARY_FILL_COLOR_NEW = "#aaeeff";
var BOUNDARY_LINE_COLOR = "#1a1a1a";
var SELECTED_FILL_COLOR = "#ffffff";

function Painter(context) {

    this.context = context;

}

Painter.prototype.draw_control_point = function (cx, cy) {

    this.context.beginPath();
    this.context.arc(cx, cy, REGION_POINT_RADIUS, 0, 2 * Math.PI, false);
    this.context.closePath();

    this.context.fillStyle = THEME_CONTROL_POINT_COLOR;
    this.context.globalAlpha = 1.0;

    this.context.fill();

}

Painter.prototype.draw_rect_region = function (x, y, w, h, is_selected) {
    
    if (is_selected) {
        this.draw_rect(x, y, w, h);

        this.context.strokeStyle = THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.context.stroke();

        this.context.fillStyle = THEME_SEL_REGION_FILL_COLOR;
        this.context.globalAlpha = THEME_SEL_REGION_OPACITY;
        this.context.fill();
        this.context.globalAlpha = 1.0;

        this.draw_control_point(x, y);
        this.draw_control_point(x + w, y + h);
        this.draw_control_point(x, y + h);
        this.draw_control_point(x + w, y);
        this.draw_control_point(x + w / 2, y);
        this.draw_control_point(x + w / 2, y + h);
        this.draw_control_point(x, y + h / 2);
        this.draw_control_point(x + w, y + h / 2);

    } else {
        // draw a fill line
        this.context.strokeStyle = THEME_BOUNDARY_FILL_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.draw_rect(x, y, w, h);
        this.context.stroke();

        if (w > THEME_REGION_BOUNDARY_WIDTH &&
            h > THEME_REGION_BOUNDARY_WIDTH) {
            // draw a boundary line on both sides of the fill line
            this.context.strokeStyle = THEME_BOUNDARY_LINE_COLOR;
            this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 4;
            this.draw_rect(x - THEME_REGION_BOUNDARY_WIDTH / 2,
                y - THEME_REGION_BOUNDARY_WIDTH / 2,
                w + THEME_REGION_BOUNDARY_WIDTH,
                h + THEME_REGION_BOUNDARY_WIDTH);
            
            this.context.stroke();

            this.draw_rect(x + THEME_REGION_BOUNDARY_WIDTH / 2,
                y + THEME_REGION_BOUNDARY_WIDTH / 2,
                w - THEME_REGION_BOUNDARY_WIDTH,
                h - THEME_REGION_BOUNDARY_WIDTH);
            this.context.stroke();
        }

    }

}

Painter.prototype.draw_rect = function (x, y, w, h) {
    this.context.beginPath();
    this.context.moveTo(x, y);
    this.context.lineTo(x + w, y);
    this.context.lineTo(x + w, y + h);
    this.context.lineTo(x, y + h);
    this.context.closePath();
}

Painter.prototype.draw_circle_region = function (cx, cy, r, is_selected) {
    
    if (is_selected) {
        this.draw_circle(cx, cy, r);

        this.context.strokeStyle = THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.context.stroke();

        this.context.fillStyle = THEME_SEL_REGION_FILL_COLOR;
        this.context.globalAlpha = THEME_SEL_REGION_OPACITY;
        this.context.fill();
        this.context.globalAlpha = 1.0;
        this.draw_control_point(cx + r, cy);

    } else {
        // draw a fill line
        this.context.strokeStyle = THEME_BOUNDARY_FILL_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.draw_circle(cx, cy, r);
        this.context.stroke();

        if (r > THEME_REGION_BOUNDARY_WIDTH) {
            // draw a boundary line on both sides of the fill line
            this.context.strokeStyle = THEME_BOUNDARY_LINE_COLOR;
            this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 4;
            this.draw_circle(cx, cy,
                r - THEME_REGION_BOUNDARY_WIDTH / 2);
            this.context.stroke();
            this.draw_circle(cx, cy,
                r + THEME_REGION_BOUNDARY_WIDTH / 2);
            this.context.stroke();
        }
    }
}

Painter.prototype.draw_circle = function (cx, cy, r) {
    this.context.beginPath();
    this.context.arc(cx, cy, r, 0, 2 * Math.PI, false);
    this.context.closePath();
}

Painter.prototype.draw_ellipse_region = function (cx, cy, rx, ry, is_selected) {

    if (is_selected) {
        this.draw_ellipse(cx, cy, rx, ry);

        this.context.strokeStyle = THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.context.stroke();

        this.context.fillStyle = THEME_SEL_REGION_FILL_COLOR;
        this.context.globalAlpha = THEME_SEL_REGION_OPACITY;
        this.context.fill();
        this.context.globalAlpha = 1.0;

        this.draw_control_point(cx + rx, cy);
        this.draw_control_point(cx, cy - ry);
    } else {
        this.context.strokeStyle = THEME_BOUNDARY_FILL_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.draw_ellipse(cx, cy, rx, ry);
        this.context.stroke();

        if (rx > THEME_REGION_BOUNDARY_WIDTH &&
            ry > THEME_REGION_BOUNDARY_WIDTH) {
            // draw a boundary line on both sides of the fill line
            this.context.strokeStyle = THEME_BOUNDARY_LINE_COLOR;
            this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 4;
            this.draw_ellipse(cx, cy,
                rx + THEME_REGION_BOUNDARY_WIDTH / 2,
                ry + THEME_REGION_BOUNDARY_WIDTH / 2);
            this.context.stroke();
            this.draw_ellipse(cx, cy,
                rx - THEME_REGION_BOUNDARY_WIDTH / 2,
                ry - THEME_REGION_BOUNDARY_WIDTH / 2);
            
            this.context.stroke();
        
        }

    }
    
}

Painter.prototype.draw_ellipse = function (cx, cy, rx, ry) {

    this.context.save();

    this.context.beginPath();
    this.context.translate(cx - rx, cy - ry);
    this.context.scale(rx, ry);
    this.context.arc(1, 1, 1, 0, 2 * Math.PI, false);

    this.context.restore(); 
    this.context.closePath();

}

Painter.prototype.draw_polygon_region = function (all_points_x, all_points_y, is_selected) {

    if (is_selected) {
        this.context.beginPath();
        this.context.moveTo(all_points_x[0], all_points_y[0]);
 
        for (var iPoint = 1; iPoint < all_points_x.length; ++iPoint) {
            this.context.lineTo(all_points_x[iPoint], all_points_y[iPoint]);
        }

        this.context.strokeStyle = THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.context.stroke();

        this.context.fillStyle = THEME_SEL_REGION_FILL_COLOR;
        this.context.globalAlpha = THEME_SEL_REGION_OPACITY;
        this.context.fill();
        this.context.globalAlpha = 1.0;

        for (var iPoint = 0; iPoint < all_points_x.length; ++iPoint) {
            this.draw_control_point(all_points_x[iPoint], all_points_y[iPoint]);
        }
    } else if (all_points_x.length == 1) {
        
        this.context.beginPath();
        this.context.strokeStyle = THEME_BOUNDARY_FILL_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.context.arc(all_points_x[0], all_points_y[0], 4, 0, 2 * Math.PI, false);
        this.context.stroke();

    } else {

        for (var iPoint = 1; iPoint < all_points_x.length; ++iPoint) {
            this.context.strokeStyle = THEME_BOUNDARY_FILL_COLOR;
            this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
            this.context.beginPath();
            this.context.arc(all_points_x[iPoint - 1], all_points_y[iPoint - 1], 4, 0, 2 * Math.PI, false);
            this.context.moveTo(all_points_x[iPoint - 1], all_points_y[iPoint - 1]);
            this.context.lineTo(all_points_x[iPoint], all_points_y[iPoint]);
            this.context.stroke();

            var iSlope = (all_points_y[iPoint] - all_points_y[iPoint - 1]) / (all_points_x[iPoint] - all_points_x[iPoint - 1]);
 
            if (iSlope > 0) {
                this.context.strokeStyle = THEME_BOUNDARY_LINE_COLOR;
                this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 4;
                this.context.beginPath();
                this.context.moveTo(parseInt(all_points_x[iPoint - 1]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint - 1]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.lineTo(parseInt(all_points_x[iPoint]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.stroke();
                this.context.beginPath();
                this.context.moveTo(parseInt(all_points_x[iPoint - 1]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint - 1]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.lineTo(parseInt(all_points_x[iPoint]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.stroke();
            } else {
                this.context.strokeStyle = THEME_BOUNDARY_LINE_COLOR;
                this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 4;
                this.context.beginPath();
                this.context.moveTo(parseInt(all_points_x[iPoint - 1]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint - 1]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.lineTo(parseInt(all_points_x[iPoint]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint]) + parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.stroke();
                this.context.beginPath();
                this.context.moveTo(parseInt(all_points_x[iPoint - 1]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint - 1]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.lineTo(parseInt(all_points_x[iPoint]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4),
                    parseInt(all_points_y[iPoint]) - parseInt(THEME_REGION_BOUNDARY_WIDTH / 4));
                this.context.stroke();
            }
            
        }

    }

}

Painter.prototype.draw_point_region = function (cx, cy, is_selected) {
    if (is_selected) {
        this.draw_point(cx, cy, REGION_POINT_RADIUS);

        this.context.strokeStyle = THEME_SEL_REGION_FILL_BOUNDARY_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.context.stroke();

        this.context.fillStyle = THEME_SEL_REGION_FILL_COLOR;
        this.context.globalAlpha = THEME_SEL_REGION_OPACITY;
        this.context.fill();
        this.context.globalAlpha = 1.0;
    } else {
        // draw a fill line
        this.context.strokeStyle = THEME_BOUNDARY_FILL_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 2;
        this.draw_point(cx, cy, REGION_POINT_RADIUS);
        this.context.stroke();

        // draw a boundary line on both sides of the fill line
        this.context.strokeStyle = THEME_BOUNDARY_LINE_COLOR;
        this.context.lineWidth = THEME_REGION_BOUNDARY_WIDTH / 4;
        this.draw_point(cx, cy,
            REGION_POINT_RADIUS - THEME_REGION_BOUNDARY_WIDTH / 2);
        this.context.stroke();
        this.draw_point(cx, cy,
            REGION_POINT_RADIUS + THEME_REGION_BOUNDARY_WIDTH / 2);
        this.context.stroke();
    }

}

Painter.prototype.draw_point = function(cx, cy, r) {
    this.context.beginPath();
    this.context.arc(cx, cy, r, 0, 2 * Math.PI, false);
    this.context.closePath();
}

