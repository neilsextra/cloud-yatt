function Canvas(painter) {

    this.painter = painter;

}

Canvas.prototype.Paint = function(current_shape, current_x, current_y, click_x0, click_y0) {
    var region_x, region_y;

    if (click_x0 < current_x) {
        if (click_y0 < current_y) {
            region_x = click_x0;
            region_y = click_y0;
        } else {
            region_x = click_x0;
            region_y = current_y;
        }
    } else {
        if (click_y0 < current_y) {
            region_x = current_x;
            region_y = click_y0;
        } else {
            region_x = current_x;
            region_y = current_y;
        }

    }

    var dx = Math.round(Math.abs(current_x - click_x0));
    var dy = Math.round(Math.abs(current_y - click_y0));

    switch (current_shape) {
        case REGION_SHAPE.RECT:
            this.painter.draw_rect_region(region_x, region_y, dx, dy, false);
            break;

        case REGION_SHAPE.CIRCLE:
            var circle_radius = Math.round(Math.sqrt(dx * dx + dy * dy));

            this.painter.draw_circle_region(region_x, region_y, circle_radius, false);
            break;

        case REGION_SHAPE.ELLIPSE:
            this.painter.draw_ellipse_region(region_x, region_y, dx, dy, false);
            break;
    
        case REGION_SHAPE.POLYGON:
            break;

        case REGION_SHAPE.POINT:
            break;

    }

}

Canvas.prototype.Resize = function(region_edge, attr, x, y, preserve_aspect_ratio) {

    switch (attr['name']) {
        case REGION_SHAPE.RECT:
            // original rectangle
            var rect = [attr['x'], attr['y'], 0, 0];
            rect[2] = rect[0] + attr['width'];
            rect[3] = rect[1] + attr['height'];

            Geometry.rect_update_corner(region_edge[1], rect, x, y, preserve_aspect_ratio);
            Geometry.rect_standardize_coordinates(rect);

            var w = Math.abs(rect[2] - rect[0]);
            var h = Math.abs(rect[3] - rect[1]);

            this.painter.draw_rect_region(rect[0], rect[1], w, h, true);

            break;

        case REGION_SHAPE.CIRCLE:
            var dx = Math.abs(attr['cx'] - x);
            var dy = Math.abs(attr['cy'] - y);
            var new_r = Math.sqrt(dx * dx + dy * dy);

            this.painter.draw_circle_region(attr['cx'],
                attr['cy'],
                new_r,
                true);
            break;

        case REGION_SHAPE.ELLIPSE:
            var new_rx = attr['rx'];
            var new_ry = attr['ry'];
            var dx = Math.abs(attr['cx'] - x);
            var dy = Math.abs(attr['cy'] - y);

            switch (region_edge[1]) {
                case 5:
                    new_ry = dy;
                    break;

                case 6:
                    new_rx = dx;
                    break;

                default:
                    new_rx = dx;
                    new_ry = dy;
                    break;
            }

            this.painter.draw_ellipse_region(attr['cx'],
                attr['cy'],
                new_rx,
                new_ry,
                true);
            break;

        case REGION_SHAPE.POLYLINE: // handled by polygon
        case REGION_SHAPE.POLYGON:
            var moved_all_points_x = attr['all_points_x'].slice(0);
            var moved_all_points_y = attr['all_points_y'].slice(0);
            var moved_vertex_id = region_edge[1] - POLYGON_RESIZE_VERTEX_OFFSET;

            moved_all_points_x[moved_vertex_id] = x;
            moved_all_points_y[moved_vertex_id] = y;

            if (moved_vertex_id === 0 && attr['name'] === REGION_SHAPE.POLYGON) {
                moved_all_points_x[moved_all_points_x.length - 1] = x;
                moved_all_points_y[moved_all_points_y.length - 1] = y;
            }

            this.painter.draw_polygon_region(moved_all_points_x,
                moved_all_points_y,
                true);

            break;

    }

}

Canvas.prototype.Move = function(attr, move_x, move_y) {

    switch (attr['name']) {
        case REGION_SHAPE.RECT:
            this.painter.draw_rect_region(attr['x'] + move_x,
                attr['y'] + move_y,
                attr['width'],
                attr['height'],
                true);
            break;

        case REGION_SHAPE.CIRCLE:
            this.painter.draw_circle_region(attr['cx'] + move_x,
                attr['cy'] + move_y,
                attr['r'],
                true);
            break;

        case REGION_SHAPE.ELLIPSE:
            this.painter.draw_ellipse_region(attr['cx'] + move_x,
                attr['cy'] + move_y,
                attr['rx'],
                attr['ry'],
                true);
            break;

        case REGION_SHAPE.POLYGON:
            var moved_all_points_x = attr['all_points_x'].slice(0);
            var moved_all_points_y = attr['all_points_y'].slice(0);

            for (var i = 0; i < moved_all_points_x.length; ++i) {
                moved_all_points_x[i] += move_x;
                moved_all_points_y[i] += move_y;
            }

            this.painter.draw_polygon_region(moved_all_points_x,
                moved_all_points_y,
                true);
            break;

        case REGION_SHAPE.POINT:
            this.painter.draw_point_region(
            attr['cx'] + move_x,
            attr['cy'] + move_y,
            true);
            break;

    }

}