function Composer(canvas_region, image_region) {

    this.canvas_region = canvas_region;
    this.image_region = image_region;

    this.image_attr = image_region.shape_attributes;
    this.canvas_attr = canvas_region.shape_attributes;

    this.preserve_aspect_ratio = false;

}

Composer.prototype.Preserve_Aspect_Ratio = function(is_ctrl_pressed) {

    if (is_ctrl_pressed) {
        preserve_aspect_ratio = true;
    }

}

Composer.prototype.Setup_Point = function(cx, cy, shape, canvas_scale) {

    this.image_attr['name'] = shape;
    this.image_attr['cx'] = Math.round(cx * canvas_scale);
    this.image_attr['cy'] = Math.round(cy * canvas_scale);

    this.canvas_attr['name'] =  shape;
    this.canvas_attr['cx'] = Math.round(cx);
    this.canvas_attr['cy'] = Math.round(cy);

}

Composer.prototype.Setup = function(shape, canvas_scale, region_x0, region_y0, region_dx, region_dy) {

    switch (shape) {
        case REGION_SHAPE.RECT:
            var x = Math.round(region_x0 * canvas_scale);
            var y = Math.round(region_y0 * canvas_scale);
            var width = Math.round(region_dx * canvas_scale);
            var height = Math.round(region_dy * canvas_scale);

            this.image_region.shape_attributes['name'] = 'rect';
            this.image_region.shape_attributes['x'] = x;
            this.image_region.shape_attributes['y'] = y;
            this.image_region.shape_attributes['width'] = width;
            this.image_region.shape_attributes['height'] = height;

            this.canvas_region.shape_attributes['name'] = 'rect';
            this.canvas_region.shape_attributes['x'] = Math.round(x / canvas_scale);
            this.canvas_region.shape_attributes['y'] = Math.round(y / canvas_scale);
            this.canvas_region.shape_attributes['width'] = Math.round(width / canvas_scale);
            this.canvas_region.shape_attributes['height'] = Math.round(height / canvas_scale);
            break;

        case REGION_SHAPE.CIRCLE:
            var cx = Math.round(region_x0 * canvas_scale);
            var cy = Math.round(region_y0 * canvas_scale);
            var r = Math.round(Math.sqrt(region_dx * region_dx + region_dy * region_dy) * canvas_scale);

            this.image_region.shape_attributes['name'] = 'circle';
            this.image_region.shape_attributes['cx'] = cx;
            this.image_region.shape_attributes['cy'] = cy;
            this.image_region.shape_attributes['r'] = r;

            this.canvas_region.shape_attributes['name'] = 'circle';
            this.canvas_region.shape_attributes['cx'] = Math.round(cx / canvas_scale);
            this.canvas_region.shape_attributes['cy'] = Math.round(cy / canvas_scale);
            this.canvas_region.shape_attributes['r'] = Math.round(r / canvas_scale);
            break;

        case REGION_SHAPE.ELLIPSE:
            var cx = Math.round(region_x0 * canvas_scale);
            var cy = Math.round(region_y0 * canvas_scale);
            var rx = Math.round(region_dx * canvas_scale);
            var ry = Math.round(region_dy * canvas_scale);

            this.image_region.shape_attributes['name'] = 'ellipse';
            this.image_region.shape_attributes['cx'] = cx;
            this.image_region.shape_attributes['cy'] = cy;
            this.image_region.shape_attributes['rx'] = rx;
            this.image_region.shape_attributes['ry'] = ry;

            this.canvas_region.shape_attributes['name'] = 'ellipse';
            this.canvas_region.shape_attributes['cx'] = Math.round(cx / canvas_scale);
            this.canvas_region.shape_attributes['cy'] = Math.round(cy / canvas_scale);
            this.canvas_region.shape_attributes['rx'] = Math.round(rx / canvas_scale);
            this.canvas_region.shape_attributes['ry'] = Math.round(ry / canvas_scale)
            break;

 
    }

}

Composer.prototype.Move = function(canvas_scale, move_x, move_y) {

    switch (this.canvas_attr['name']) {
        case REGION_SHAPE.RECT:
            var xnew = this.image_attr['x'] + Math.round(move_x * canvas_scale);
            var ynew = this.image_attr['y'] + Math.round(move_y * canvas_scale);

            this.image_attr['x'] = xnew;
            this.image_attr['y'] = ynew;

            this.canvas_attr['x'] = Math.round(this.image_attr['x'] / canvas_scale);
            this.canvas_attr['y'] = Math.round(this.image_attr['y'] / canvas_scale);

            break;

        case REGION_SHAPE.CIRCLE:  
        case REGION_SHAPE.ELLIPSE:  
            var cxnew = this.image_attr['cx'] + Math.round(move_x * canvas_scale);
            var cynew = this.image_attr['cy'] + Math.round(move_y * canvas_scale);

            this.image_attr['cx'] = cxnew;
            this.image_attr['cy'] = cynew;

            this.canvas_attr['cx'] = Math.round(this.image_attr['cx'] / canvas_scale);
            this.canvas_attr['cy'] = Math.round(this.image_attr['cy'] / canvas_scale);
            break;

        case REGION_SHAPE.POLYGON:
            var img_px = this.image_attr['all_points_x'];
            var img_py = this.image_attr['all_points_y'];

            for (var i = 0; i < img_px.length; ++i) {
                img_px[i] = img_px[i] + Math.round(move_x * canvas_scale);
                img_py[i] = img_py[i] + Math.round(move_y * canvas_scale);
            }

            var canvas_px = this.canvas_attr['all_points_x'];
            var canvas_py = this.canvas_attr['all_points_y'];

            for (var i = 0; i < canvas_px.length; ++i) {
                canvas_px[i] = Math.round(img_px[i] / canvas_scale);
                canvas_py[i] = Math.round(img_py[i] / canvas_scale);
            }

            break;

        case REGION_SHAPE.POINT:
            console.log("inise Point: ");

            var cxnew = this.image_attr['cx'] + Math.round(move_x * canvas_scale);
            var cynew = this.image_attr['cy'] + Math.round(move_y * canvas_scale);

            this.image_attr['cx'] = cxnew;
            this.image_attr['cy'] = cynew;

            this.canvas_attr['cx'] = Math.round(this.image_attr['cx'] / canvas_scale);
            this.canvas_attr['cy'] = Math.round(this.image_attr['cy'] / canvas_scale);
            break;

    }

}

Composer.prototype.Resize = function(canvas_scale, region_edge, current_x, current_y) {

    switch (this.canvas_attr['name']) {

        case REGION_SHAPE.RECT:
            var d = [this.canvas_attr['x'], this.canvas_attr['y'], 0, 0];
            d[2] = d[0] + this.canvas_attr['width'];
            d[3] = d[1] + this.canvas_attr['height'];

            var mx = current_x;
            var my = current_y;

            // constrain (mx,my) to lie on a line connecting a diagonal of rectangle

            Geometry.rect_update_corner(region_edge[1], d, mx, my, this.preserve_aspect_ratio);
            Geometry.rect_standardize_coordinates(d);

            var w = Math.abs(d[2] - d[0]);
            var h = Math.abs(d[3] - d[1]);

            this.image_attr['x'] = Math.round(d[0] * canvas_scale);
            this.image_attr['y'] = Math.round(d[1] * canvas_scale);
            this.image_attr['width'] = Math.round(w * canvas_scale);
            this.image_attr['height'] = Math.round(h * canvas_scale);

            this.canvas_attr['x'] = Math.round(this.image_attr['x'] / canvas_scale);
            this.canvas_attr['y'] = Math.round(this.image_attr['y'] / canvas_scale);
            this.canvas_attr['width'] = Math.round(this.image_attr['width'] / canvas_scale);
            this.canvas_attr['height'] = Math.round(this.image_attr['height'] / canvas_scale);
            break;

        case REGION_SHAPE.CIRCLE:
            var dx = Math.abs(this.canvas_attr['cx'] - current_x);
            var dy = Math.abs(this.canvas_attr['cy'] - current_y);
            var new_r = Math.sqrt(dx * dx + dy * dy);

            this.image_attr['r'] = Math.round(new_r * canvas_scale);
            this.canvas_attr['r'] = Math.round(this.image_attr['r'] / canvas_scale);
            break;

        case REGION_SHAPE.ELLIPSE:
            var new_rx = this.canvas_attr['rx'];
            var new_ry = this.canvas_attr['ry'];

            var dx = Math.abs(this.canvas_attr['cx'] - current_x);
            var dy = Math.abs(this.canvas_attr['cy'] - current_y);

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

            this.image_attr['rx'] = Math.round(new_rx * canvas_scale);
            this.image_attr['ry'] = Math.round(new_ry * canvas_scale);

            this.canvas_attr['rx'] = Math.round(this.image_attr['rx'] / canvas_scale);
            this.canvas_attr['ry'] = Math.round(this.image_attr['ry'] / canvas_scale);

            break;

        case REGION_SHAPE.POLYGON:
            var moved_vertex_id = region_edge[1] - POLYGON_RESIZE_VERTEX_OFFSET;

            var imx = Math.round(current_x * canvas_scale);
            var imy = Math.round(current_y * canvas_scale);

            this.image_attr['all_points_x'][moved_vertex_id] = imx;
            this.image_attr['all_points_y'][moved_vertex_id] = imy;
            this.canvas_attr['all_points_x'][moved_vertex_id] = Math.round(imx / canvas_scale);
            this.canvas_attr['all_points_y'][moved_vertex_id] = Math.round(imy / canvas_scale);

            if (moved_vertex_id === 0 && this.canvas_attr['name'] === REGION_SHAPE.POLYGON) {
                // move both first and last vertex because we
                // the initial point at the end to close path
                var n = this.canvas_attr['all_points_x'].length;

                this.image_attr['all_points_x'][n - 1] = imx;
                this.image_attr['all_points_y'][n - 1] = imy;
                this.canvas_attr['all_points_x'][n - 1] = Math.round(imx / canvas_scale);
                this.canvas_attr['all_points_y'][n - 1] = Math.round(imy / canvas_scale);
            }

            break;

    }

}