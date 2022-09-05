function Geometry() {}

/**
 * Detect a point is inside a region
 * 
 * @param canvas_regions the Canvas regions
 * @param px the 'X' coordinate
 * @param py the 'Y' coordinate
 * @param descending_order the Descending Order
 * 
 * @returns the Region Identifier if found or -1
 * 
 */
Geometry.is_inside_regions = function(canvas_regions, x, y, descending_order) {
    var regions = canvas_regions.length;

    if (regions === 0) {
        return -1;
    }
    var start, end, del;

    if (descending_order) {

        start = regions - 1;
        end = -1;
        del = -1;
    } else {
        start = 0;
        end = regions;
        del = 1;
    }

    var iRegion = start;

    while (iRegion !== end) {
        var found = Geometry.is_inside_region(canvas_regions, x, y, iRegion);
        if (found) {
            return iRegion;
        }

        iRegion = iRegion + del;

    }

    return -1;

}

/**
 * Detect a point is inside a specified region
 * 
 * @param canvas_regions the Canvas regions
 * @param x the 'X' coordinate
 * @param y the 'Y' coordinate
 * @param region_id the The region Identifier
 * 
 * @returns the 'true' if found, false otherwise
 * 
 */
Geometry.is_inside_region = function(canvas_regions, x, y, region_id) {
    var attr = canvas_regions[region_id].shape_attributes;
    var result = false;

    switch (attr['name']) {
        case REGION_SHAPE.RECT:
            result = Geometry.is_inside_rect(attr['x'],
                attr['y'],
                attr['width'],
                attr['height'],
                x, y);
            break;

        case REGION_SHAPE.CIRCLE:
            result = Geometry.is_inside_circle(attr['cx'],
                attr['cy'],
                attr['r'],
                x, y);
            break;

        case REGION_SHAPE.ELLIPSE:
            result = Geometry.is_inside_ellipse(attr['cx'],
                attr['cy'],
                attr['rx'],
                attr['ry'],
                x, y);
            break;

        case REGION_SHAPE.POLYGON:
            result = Geometry.is_inside_polygon(attr['all_points_x'],
                attr['all_points_y'],
                x, y);
            break;

        case REGION_SHAPE.POINT:
            result = Geometry.is_inside_point(attr['cx'],
                attr['cy'],
                x, y);
            break;
    }

    return result;

}

Geometry.is_inside_circle = function(cx, cy, r, px, py) {
    var dx = px - cx;
    var dy = py - cy;

    return (dx * dx + dy * dy) < r * r;
}

Geometry.is_inside_rect = function(x, y, w, h, px, py) {

    return px > x &&
        px < (x + w) &&
        py > y &&
        py < (y + h);

}

Geometry.is_inside_ellipse = function(cx, cy, rx, ry, px, py) {
    var dx = (cx - px);
    var dy = (cy - py);

    return ((dx * dx) / (rx * rx)) + ((dy * dy) / (ry * ry)) < 1;

}

/**
 * 
 * source: http://geomalgorithms.com/a03-_inclusion.html
 */

Geometry.is_inside_polygon = function(points_x, points_y, px, py) {
    var wn = 0; // the  winding number counter

    // loop through all edges of the polygon
    for (var iPoint = 0; iPoint < points_x.length - 1; ++iPoint) { // edge from V[i] to  V[i+1]
        var is_left_value = Geometry.is_left(points_x[iPoint], points_y[iPoint],
            points_x[iPoint + 1], points_y[iPoint + 1],
            px, py);

        if (points_y[iPoint] <= py) {
            if (points_y[iPoint + 1] > py && is_left_value > 0) {
                ++wn;
            }
        } else {
            if (points_y[iPoint + 1] <= py && is_left_value < 0) {
                --wn;
            }
        }
    }

    return (wn === 0) ? 0 : 1;

}

Geometry.is_inside_point = function(cx, cy, px, py) {
    var dx = px - cx;
    var dy = py - cy;
    var r2 = POLYGON_VERTEX_MATCH_TOL * POLYGON_VERTEX_MATCH_TOL;

    return (dx * dx + dy * dy) < r2;

}

/**
 * 
 *  
 * returns
 * >0 if (x2,y2) lies on the left side of line joining (x0,y0) and (x1,y1)
 * =0 if (x2,y2) lies on the line joining (x0,y0) and (x1,y1)
 *  >0 if (x2,y2) lies on the right side of line joining (x0,y0) and (x1,y1)
 * source: http://geomalgorithms.com/a03-_inclusion.html
 */
Geometry.is_left = function(x0, y0, x1, y1, x2, y2) {

    return (((x1 - x0) * (y2 - y0)) - ((x2 - x0) * (y1 - y0)));

}

/**
 * Is on a corner
 * 
 * @param canvas_regions the Canvas regions
 * @param px the 'X' coordinate
 * @param py the 'Y' coordinate
 * 
 * @returns the region edge
 * 
 */
Geometry.is_on_region_corner = function(canvas_regions, x, y) {
    var region_edge = [-1, -1]; // region_id, corner_id [top-left=1,top-right=2,bottom-right=3,bottom-left=4]

    for (var iRegion = 0; iRegion < canvas_regions.length; ++iRegion) {
        var attr = canvas_regions[iRegion].shape_attributes;
        var result = false;
        region_edge[0] = iRegion;

        switch (attr['name']) {
            case REGION_SHAPE.RECT:
                result = Geometry.is_on_rect_edge(attr['x'],
                    attr['y'],
                    attr['width'],
                    attr['height'],
                    x, y);
                break;

            case REGION_SHAPE.CIRCLE:
                result = Geometry.is_on_circle_edge(attr['cx'],
                    attr['cy'],
                    attr['r'],
                    x, y);
                break;

            case REGION_SHAPE.ELLIPSE:
                result = Geometry.is_on_ellipse_edge(attr['cx'],
                    attr['cy'],
                    attr['rx'],
                    attr['ry'],
                    x, y);
                break;

            case REGION_SHAPE.POLYGON:
                result = Geometry.is_on_polygon_vertex(attr['all_points_x'],
                    attr['all_points_y'],
                    x, y);
                break;

            case REGION_SHAPE.POINT:
                result = 0;
                break;
        }

        if (result > 0) {
            region_edge[1] = result;
            return region_edge;
        }
        
    }

    region_edge[0] = -1;

    return region_edge;
}

Geometry.is_on_rect_edge = function(x, y, w, h, px, py) {
    var dx0 = Math.abs(x - px);
    var dy0 = Math.abs(y - py);
    var dx1 = Math.abs(x + w - px);
    var dy1 = Math.abs(y + h - py);

    //[top-left=1,top-right=2,bottom-right=3,bottom-left=4]
    if (dx0 < REGION_EDGE_TOL &&
        dy0 < REGION_EDGE_TOL) {
        return 1;
    }

    if (dx1 < REGION_EDGE_TOL &&
        dy0 < REGION_EDGE_TOL) {
        return 2;
    }

    if (dx1 < REGION_EDGE_TOL &&
        dy1 < REGION_EDGE_TOL) {
        return 3;
    }

    if (dx0 < REGION_EDGE_TOL &&
        dy1 < REGION_EDGE_TOL) {
        return 4;
    }

    var mx0 = Math.abs(x + w / 2 - px);
    var my0 = Math.abs(y + h / 2 - py);
    //[top-middle=5,right-middle=6,bottom-middle=7,left-middle=8]
    if (mx0 < REGION_EDGE_TOL &&
        dy0 < REGION_EDGE_TOL) {
        return 5;
    }
    if (dx1 < REGION_EDGE_TOL &&
        my0 < REGION_EDGE_TOL) {
        return 6;
    }
    if (mx0 < REGION_EDGE_TOL &&
        dy1 < REGION_EDGE_TOL) {
        return 7;
    }
    if (dx0 < REGION_EDGE_TOL &&
        my0 < REGION_EDGE_TOL) {
        return 8;
    }

    return 0;
}

Geometry.is_on_circle_edge = function(cx, cy, r, px, py) {
    var dx = cx - px;
    var dy = cy - py;
    if (Math.abs(Math.sqrt(dx * dx + dy * dy) - r) < REGION_EDGE_TOL) {
        var theta = Math.atan2(py - cy, px - cx);
        if (Math.abs(theta - (Math.PI / 2)) < THETA_TOL ||
            Math.abs(theta + (Math.PI / 2)) < THETA_TOL) {
            return 5;
        }
        if (Math.abs(theta) < THETA_TOL ||
            Math.abs(Math.abs(theta) - Math.PI) < THETA_TOL) {
            return 6;
        }

        if (theta > 0 && theta < (Math.PI / 2)) {
            return 1;
        }
        if (theta > (Math.PI / 2) && theta < (Math.PI)) {
            return 4;
        }
        if (theta < 0 && theta > -(Math.PI / 2)) {
            return 2;
        }
        if (theta < -(Math.PI / 2) && theta > -Math.PI) {
            return 3;
        }
    } else {
        return 0;
    }
}

Geometry.is_on_ellipse_edge = function(cx, cy, rx, ry, px, py) {
    var dx = (cx - px) / rx;
    var dy = (cy - py) / ry;

    if (Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) < ELLIPSE_EDGE_TOL) {
        var theta = Math.atan2(py - cy, px - cx);
        if (Math.abs(theta - (Math.PI / 2)) < THETA_TOL ||
            Math.abs(theta + (Math.PI / 2)) < THETA_TOL) {
            return 5;
        }
        if (Math.abs(theta) < THETA_TOL ||
            Math.abs(Math.abs(theta) - Math.PI) < THETA_TOL) {
            return 6;
        }
    } else {
        return 0;
    }
}

Geometry.is_on_polygon_vertex = function(all_points_x, all_points_y, px, py) {
    var n = all_points_x.length;
    for (var i = 0; i < n; ++i) {
        if (Math.abs(all_points_x[i] - px) < POLYGON_VERTEX_MATCH_TOL &&
            Math.abs(all_points_y[i] - py) < POLYGON_VERTEX_MATCH_TOL) {
            return (POLYGON_RESIZE_VERTEX_OFFSET + i);
        }
    }

    return 0;

}

Geometry.rect_update_corner = function(corner_id, d, x, y, preserve_aspect_ratio) {
    // pre-condition : d[x0,y0,x1,y1] is standardized
    // post-condition : corner is moved ( d may not stay standardized )
    if (preserve_aspect_ratio) {
        switch (corner_id) {
            case 1: // Fall-through // top-left
            case 3: // bottom-right
                var dx = d[2] - d[0];
                var dy = d[3] - d[1];
                var norm = Math.sqrt(dx * dx + dy * dy);
                var nx = dx / norm; // x component of unit vector along the diagonal of rect
                var ny = dy / norm; // y component
                var proj = (x - d[0]) * nx + (y - d[1]) * ny;
                var proj_x = nx * proj;
                var proj_y = ny * proj;
                // constrain (mx,my) to lie on a line connecting (x0,y0) and (x1,y1)
                x = Math.round(d[0] + proj_x);
                y = Math.round(d[1] + proj_y);
                break;

            case 2: // Fall-through // top-right
            case 4: // bottom-left
                var dx = d[2] - d[0];
                var dy = d[1] - d[3];
                var norm = Math.sqrt(dx * dx + dy * dy);
                var nx = dx / norm; // x component of unit vector along the diagonal of rect
                var ny = dy / norm; // y component
                var proj = (x - d[0]) * nx + (y - d[3]) * ny;
                var proj_x = nx * proj;
                var proj_y = ny * proj;
                // constrain (mx,my) to lie on a line connecting (x0,y0) and (x1,y1)
                x = Math.round(d[0] + proj_x);
                y = Math.round(d[3] + proj_y);
                break;
        }
    }

    switch (corner_id) {
        case 1: // top-left
            d[0] = x;
            d[1] = y;
            break;

        case 3: // bottom-right
            d[2] = x;
            d[3] = y;
            break;

        case 2: // top-right
            d[2] = x;
            d[1] = y;
            break;

        case 4: // bottom-left
            d[0] = x;
            d[3] = y;
            break;

        case 5: // top-middle
            d[1] = y;
            break;

        case 6: // right-middle
            d[2] = x;
            break;

        case 7: // bottom-middle
            d[3] = y;
            break;

        case 8: // left-middle
            d[0] = x;
            break;
    }

}

Geometry.rect_standardize_coordinates = function(rect) {
    // d[x0,y0,x1,y1]
    // ensures that (d[0],d[1]) is top-left corner while
    // (d[2],d[3]) is bottom-right corner
    if (rect[0] > rect[2]) {
        // swap
        var t = rect[0];
        rect[0] = rect[2];
        rect[2] = t;
    }

    if (rect[1] > rect[3]) {
        // swap
        var t = rect[1];
        rect[1] = rect[3];
        rect[3] = t;
    }

}