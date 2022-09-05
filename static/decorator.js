function Decorator(region) {

    this.region = region;

}

Decorator.prototype.rescale = function (region, canvas_scale) {

    switch (this.region.shape_attributes['name']) {

        case REGION_SHAPE.RECT:
            var x = region.shape_attributes['x'] / canvas_scale;
            var y = region.shape_attributes['y'] / canvas_scale;
            var width = region.shape_attributes['width'] / canvas_scale;
            var height = region.shape_attributes['height'] / canvas_scale;

            this.region.shape_attributes['x'] = Math.round(x);
            this.region.shape_attributes['y'] = Math.round(y);
            this.region.shape_attributes['width'] = Math.round(width);
            this.region.shape_attributes['height'] = Math.round(height);
            break;

        case REGION_SHAPE.CIRCLE:
            var cx = region.shape_attributes['cx'] / canvas_scale;
            var cy =region.shape_attributes['cy'] / canvas_scale;
            var r = region.shape_attributes['r'] / canvas_scale;

            this.region.shape_attributes['cx'] = Math.round(cx);
            this.region.shape_attributes['cy'] = Math.round(cy);
            this.region.shape_attributes['r'] = Math.round(r);
            break;

        case REGION_SHAPE.ELLIPSE:
            var cx = region.shape_attributes['cx'] / canvas_scale;
            var cy = region.shape_attributes['cy'] / canvas_scale;
            var rx = region.shape_attributes['rx'] / canvas_scale;
            var ry = region.shape_attributes['ry'] / canvas_scale;

            this.region.shape_attributes['cx'] = Math.round(cx);
            this.region.shape_attributes['cy'] = Math.round(cy);
            this.region.shape_attributes['rx'] = Math.round(rx);
            this.region.shape_attributes['ry'] = Math.round(ry);
            break;

        case REGION_SHAPE.POLYGON:
            var all_points_x = region.shape_attributes['all_points_x'].slice(0);
            var all_points_y = region.shape_attributes['all_points_y'].slice(0);

            for (var iPoint = 0; iPoint < all_points_x.length; ++iPoint) {
                all_points_x[iPoint] = Math.round(all_points_x[iPoint] / canvas_scale);
                all_points_y[iPoint] = Math.round(all_points_y[iPoint] / canvas_scale);
            }

            this.region.shape_attributes['all_points_x'] = all_points_x;
            this.region.shape_attributes['all_points_y'] = all_points_y;
            break;

        case REGION_SHAPE.POINT:
            var cx = region.shape_attributes['cx'] / canvas_scale;
            var cy = region.shape_attributes['cy'] / canvas_scale;

            this.region.shape_attributes['cx'] = Math.round(cx);
            this.region.shape_attributes['cy'] = Math.round(cy);
            break;

    }

}

