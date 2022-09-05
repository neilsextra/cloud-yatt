/**
 * Electron Version VGG Annorator Tool
 * 
 */

"use strict";

var VERSION = '1.0.0';
var NAME = 'Yet Another Tagging Tool';
var SHORT_NAME = 'YATT';
var REGION_SHAPE = {
    RECT: 'rect',
    CIRCLE: 'circle',
    ELLIPSE: 'ellipse',
    POLYGON: 'polygon',
    POINT: 'point'
};

var REGION_EDGE_TOL = 20; // pixel
var REGION_CONTROL_POINT_SIZE = 2;
var REGION_POINT_RADIUS = 3;
var POLYGON_VERTEX_MATCH_TOL = 5;
var REGION_MIN_DIM = 3;
var MOUSE_CLICK_TOL = 2;
var ELLIPSE_EDGE_TOL = 0.2; // euclidean distance
var THETA_TOL = Math.PI / 18; // 10 degrees
var POLYGON_RESIZE_VERTEX_OFFSET = 100;
var CANVAS_DEFAULT_ZOOM_LEVEL_INDEX = 3;
var CANVAS_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4, 5];

var THEME_REGION_BOUNDARY_WIDTH = 4;
var THEME_BOUNDARY_LINE_COLOR = "#1a1a1a";
var THEME_BOUNDARY_FILL_COLOR = "#aaeeff";
var THEME_SEL_REGION_FILL_COLOR = "#808080";
var THEME_SEL_REGION_FILL_BOUNDARY_COLOR = "#000000";
var THEME_SEL_REGION_OPACITY = 0.5;
var THEME_MESSAGE_TIMEOUT_MS = 6000;
var THEME_ATTRIBUTE_VALUE_FONT = '10pt Arial';
var THEME_CONTROL_POINT_COLOR = '#ff0000';

var CSV_SEP = ',';
var CSV_QUOTE_CHAR = '"';
var CSV_KEYVAL_SEP = ':';
var IMPORT_CSV_COMMENT_CHAR = '#';

var __img_metadata = {}; // data structure to store loaded images metadata
var __img_count = 0; // count of the loaded images
var __canvas_regions = []; // image regions spec. in canvas space
var __canvas_scale = 1.0; // current scale of canvas image

var __image_id_list = []; // array of image id (in original order)
var __image_id = ''; // id={filename+length} of current image
var __image_index = -1; // index
var __input_focus = false; // image list has focus

var __current_image;
var __current_image_width;
var __current_image_height;

// image canvas
var __img_canvas = document.getElementById("image_canvas");
var __img_ctx = __img_canvas.getContext("2d");

var __reg_canvas = document.getElementById("region_canvas");
var __reg_ctx = __reg_canvas.getContext("2d");

var __painter = new Painter(__reg_ctx);

var __canvas_width, __canvas_height;

// canvas zoom
var __canvas_zoom_level_index = CANVAS_DEFAULT_ZOOM_LEVEL_INDEX; // 1.0
var __canvas_scale_without_zoom = 1.0;

// state of the application
var __is_user_drawing_region = false;
var __is_current_image_loaded = false;
var __is_window_resized = false;
var __is_user_resizing_region = false;
var __is_user_moving_region = false;
var __is_user_drawing_polygon = false;
var __is_region_selected = false;
var __is_all_region_selected = false;
var __is_user_updating_attribute_name = false;
var __is_user_updating_attribute_value = false;
var __is_user_adding_attribute_name = false;
var __is_loaded_img_list_visible = false;
var __is_attributes_panel_visible = false;
var __is_reg_attr_panel_visible = false;
var __is_canvas_zoomed = false;
var __is_loading_current_image = false;
var __is_region_id_visible = true;
var __is_region_boundary_visible = true;
var __is_ctrl_pressed = false;

// region
var __current_shape = REGION_SHAPE.RECT;
var __current_polygon_region_id = -1;
var __user_sel_region_id = -1;
var __click_x0 = 0;
var __click_y0 = 0;
var __click_x1 = 0;
var __click_y1 = 0;
var __region_click_x, __region_click_y;
var __copied_image_regions = [];
var __region_edge = [-1, -1];
var __current_x = 0;
var __current_y = 0;

// message
var __message_clear_timer;

// attributes
var __region_attributes = {};
var __current_update_attribute_name = "";
var __current_update_region_id = -1;
var __visible_attr_name = '';

// persistence to local storage
var __is_local_storage_available = false;
var __is_save_ongoing = false;

// image list
var __reload_img_fn_list_table = true;
var __loaded_img_fn_list = [];
var __loaded_img_fn_list_file_index = [];
var __loaded_img_fn_list_table_html = [];

// models
var __model_list = {};

// UI html elements
var blocker = document.getElementById("blocker");
var invisible_file_input = document.getElementById("invisible_file_input");
var display_area = document.getElementById("display_area");
var ui_top_panel = document.getElementById("ui_top_panel");
var canvas_panel = document.getElementById("canvas_panel");
var action_panel = document.getElementById("action_panel");

var annotation_list_snippet = document.getElementById("annotation_list_snippet");
var annotation_textarea = document.getElementById("annotation_textarea");

var img_fn_list_panel = document.getElementById('img_fn_list_panel');
var img_fn_list = document.getElementById('img_fn_list');
var attributes_tab_panel = document.getElementById('attributes_tab_panel');
var attributes_toggle_button = document.getElementById('attributes_toggle_button');
var ok_button = document.getElementById('ok_button');
var cancel_button = document.getElementById('cancel_button');
var body = document.getElementById('body');

var LINE_WIDTH = 4;
var SELECTED_OPACITY = 0.3;
var BOUNDARY_FILL_COLOR_ANNOTATED = "#f2f2f2";
var BOUNDARY_FILL_COLOR_NEW = "#aaeeff";
var BOUNDARY_LINE_COLOR = "#1a1a1a";
var SELECTED_FILL_COLOR = "#ffffff";

var close_dialog = null;

var __shift_key = null;

var __storage = new Storage('img_metadata');
var __metrics = new Metrics();

/**
 * Bounding Box Initialization
 * 
 */
function __init() {
    show_message(NAME + ' (' + SHORT_NAME + ') version ' + VERSION +
        '. Ready', 2 * THEME_MESSAGE_TIMEOUT_MS);

    show_home_panel();

    init_leftsidebar_accordion();

    cancel_button.addEventListener('click', function (event) {
        close_model_panel();
    });

    // run attached sub-modules (if any)
    if (typeof __load_submodules === 'function') {
        setTimeout(function () {
            __load_submodules();
        }, 100);
    }

    resize_image_list();

    close_dialog = function (e) {
        close_model_panel();
    }

    window.addEventListener('mouseup', function (e) {

        if (__is_user_drawing_region) {

            __draw_region(__current_x, __current_y, __shift_key);

        }

    });

    window.addEventListener('dblclick', function (e) { });

    window.addEventListener("resize", function (event) {
        __update_ui_components();
    });

}

/**
 * Update the Componets
 * 
 */
function __update_ui_components() {

    if (!__is_window_resized && __is_current_image_loaded) {
        set_all_text_panel_display('none');
        show_all_canvas();

        __is_window_resized = true;
        __show_image(__image_index);

        if (__is_canvas_zoomed) {
            reset_zoom_level();
        }

    }

    resize_image_list();

}

/**
 * Show Home Panel
 */
function show_home_panel() {
    if (__is_current_image_loaded) {
        show_all_canvas();
        set_all_text_panel_display('none');
    }

}

/**
 * Load the Archive
 */
function load_archive() {
    var archive = new Archive(__img_metadata);

    archive.load().then(files => {
        var tags = files.tags;
        var images = files.images;
        var names = files.names;

        __img_count = 0;
        __image_id_list.length = 0;
        __loaded_img_fn_list.length = 0;

        for (var iImage in images) {
            var region = new Region();
            var attributes = tags[iImage];

            var metadata = new Metadata(images[iImage], names[iImage], attributes.size);

            for (var iRegion in attributes.regions) {
                var definition = attributes.regions[iRegion];

                var region = new Region();

                region.region_attributes = attributes.regions[iRegion].region_attributes;
                region.shape_attributes = attributes.regions[iRegion].shape_attributes;

                metadata.add_region(region);

            }

            __img_metadata[names[iImage]] = metadata;
            __image_id_list.push(names[iImage]);
            __loaded_img_fn_list.push(names[iImage]);
            __img_count += 1;
            __reload_img_fn_list_table = true;

        }

        __show_image(0);

        __update_img_fn_list();

        document.getElementById("waitDialog").style.display = "none";

    });

}

/**
 * Save the Archive
 */
function save_archive() {
    var archive = new Archive(__img_metadata);

    archive.save();

}

/**
 * Load from the Cloud
 */
function load_from_cloud() {

    document.getElementById("ok_cloud_connect_button").onclick = function () {

        document.getElementById("waitDialog").style.display = "inline-block";
        document.getElementById("cloud-connect").style.display = "none";


        var cloud = new Cloud(__img_metadata);

        var token = document.getElementById("cloud-token").value;
        var container = document.getElementById("cloud-container").value;

        cloud.query(token, container).then(files => {
            var tags = files.tags;
            var images = files.images;
            var names = files.names;
            var models = files.models;

            __img_count = 0;
            __image_id_list.length = 0;
            __loaded_img_fn_list.length = 0;

            for (var iImage in images) {
                var region = new Region();
                var attributes = tags[iImage];

                var metadata = new Metadata(images[iImage], names[iImage], attributes.size);

                for (var iRegion in attributes.regions) {
                    var definition = attributes.regions[iRegion];

                    var region = new Region();

                    region.region_attributes = attributes.regions[iRegion].region_attributes;
                    region.shape_attributes = attributes.regions[iRegion].shape_attributes;

                    metadata.add_region(region);

                }

                __img_metadata[names[iImage]] = metadata;
                __image_id_list.push(names[iImage]);
                __loaded_img_fn_list.push(names[iImage]);
                __img_count += 1;
                __reload_img_fn_list_table = true;

            }

            __model_list.len = 0;

            var html = `<a onclick="load_model()" title="Load a model">Load a Model</a>`;

            for (var iModel in models) {

                console.log(`Found Found: ${models[iModel].filename}`);

                __model_list[models[iModel].filename] = models[iModel];

                var model_list_html = document.getElementById('model-list');

                model_list_html.innerHTML = html +
                    `<a onclick="select_model('${models[iModel].filename}')" title="Assist with model - $">Apply: ${models[iModel].filename}</a>`;

                console.log(model_list_html.innerHTML);

            }

            __show_image(0);

            __update_img_fn_list();

            document.getElementById("waitDialog").style.display = "none"
        });

    }

    document.getElementById("cloud-connect").style.display = "inline-block";

}


function close_cloud_connection_panel() {

    document.getElementById("cloud-connect").style.display = "none";

}

/**
 * Save to the Cloud
 */
function save_to_cloud() {

    document.getElementById("ok_cloud_connect_button").onclick = function () {
        document.getElementById("waitMessage").textContent = '';
        document.getElementById("waitDialog").style.display = "inline-block";
        document.getElementById("cloud-connect").style.display = "none";

        var cloud = new Cloud(__img_metadata);

        var token = document.getElementById("cloud-token").value;
        var container = document.getElementById("cloud-container").value;

        cloud.save(token, container).then(result => {
            document.getElementById("waitDialog").style.display = "none";
        });

    }

    document.getElementById("cloud-connect").style.display = "inline-block";

}

function load_model() {

    document.getElementById("ok_cloud_connect_button").onclick = function () {
        document.getElementById("cloud-connect").style.display = "none";
        document.getElementById("waitMessage").textContent = `Uploading Model...`;

        document.getElementById("waitDialog").style.display = "inline-block";

        var cloud = new Cloud(__img_metadata);

        var token = document.getElementById("cloud-token").value;
        var container = document.getElementById("cloud-container").value;

        cloud.upload(token, container, 'pt').then(result => {
            document.getElementById("waitDialog").style.display = "none";

            console.log(`Filenames: ${result.filenames.length}`);

            for (var iFilename = 0; iFilename < result.filenames.length; iFilename++) {

                if (!__model_list.hasOwnProperty(result.filenames[iFilename])) {

                    __model_list[result.filenames[iFilename]] = {
                        filename: result.filenames[iFilename],
                        token: result.token,
                        container: result.container
                    };

                    var model_list_html = document.getElementById('model-list');
                    var html = model_list_html.innerHTML;

                    model_list_html.innerHTML = html +
                        `<a onclick="select_model('${result.filenames[iFilename]}')" title="Assist with model - $">Apply: ${result.filenames[iFilename]}</a>`;

                    console.log(model_list_html.innerHTML);

                }

            }

            show_message(`Model: ${result.filename} saved`);

        });

    }

    document.getElementById("cloud-connect").style.display = "inline-block";

}

/**
 * Select the Model
 * 
 * @param model_id the Model to select
 * 
 */
async function select_model(model_id) {

    document.getElementById("waitMessage").textContent = `Applying Model...`;
    document.getElementById("waitDialog").style.display = "inline-block";

    var model = new Model(__img_metadata);
    var results = await model.apply(__model_list[model_id].token, __model_list[model_id].container, model_id, __image_id);

    console.log(results);

    var response = JSON.parse(results['result']['response']);

    __toggle_all_regions_selection(false);

    for (var regions in response) {

        console.log(response[regions]);

        var boxes = response[regions]['boxes'];

        for (var box in boxes) {
            var canvas_point_region = new Region();
            var image_point_region = new Region();

            var composer = new Composer(canvas_point_region, image_point_region);
            var dimensions = __img_metadata[__image_id].get_dimensions();

            var width = Math.trunc(boxes[box][4] * dimensions.width / __canvas_scale);
            var height = Math.trunc(boxes[box][5] * dimensions.height / __canvas_scale);

            var x = Math.trunc((boxes[box][2] * dimensions.width / __canvas_scale) - (width / 2));
            var y = Math.trunc((boxes[box][3] * dimensions.height / __canvas_scale) - (height / 2));

            console.log(boxes[box]);

            console.log(`s: ${__canvas_scale}, t: ${boxes[box][1]}, x: ${x}, y:  ${y}, w: ${width}, h: ${height}`);

            composer.Setup(REGION_SHAPE.RECT, __canvas_scale, x, y, width, height);

            image_point_region.region_attributes["tag"] = boxes[box][1];

            image_point_region.is_user_selected = true;
            canvas_point_region.is_user_selected = true;

            __img_metadata[__image_id].regions.push(image_point_region);
            __canvas_regions.push(canvas_point_region);
            __update_attributes_panel();

        }

    }

    __redraw_reg_canvas();
    __reg_canvas.focus();
    __update_attributes_panel();

    document.getElementById("waitDialog").style.display = "none";

}

/**
 * Select the Local Images
 */
function sel_local_images() {
    var loadButton = document.createElementNS("http://www.w3.org/1999/xhtml", "input");

    loadButton.setAttribute("type", "file");
    loadButton.accept = '.jpg,.jpeg,.png,.bmp';
    loadButton.multiple = true;
    loadButton.onchange = store_local_img_ref;
    loadButton.click();

}

/**
 * Clear the Local Images
 */
function clear_local_images() {

    __img_count = 0;
    __img_metadata = {};

    __img_count = 0;

    __image_id_list.length = 0;
    __loaded_img_fn_list.length = 0;
    __canvas_regions.length = 0;

    __region_attributes = {};

    __image_id = '';
    __is_current_image_loaded = false;

    set_all_canvas_size(0, 0);

    __update_img_fn_list();

    set_all_text_panel_display('none');

    __reg_ctx.clearRect(0, 0, __reg_canvas.width, __reg_canvas.height);
    __img_ctx.clearRect(0, 0, __img_canvas.width, __img_canvas.height);

    __reload_img_fn_list_table = true;

    var region_attributes_table = document.getElementById('region_attributes_table');

    if (region_attributes_table != null) {
        region_attributes_table.parentNode.removeChild(region_attributes_table);
    }

}

function close_model_panel() {
    var dialog = document.getElementById("dialog");

    dialog.style.display = "none";
    blocker.style.display = "none";

}

function show_about_panel() {
    set_all_text_panel_display('none');

    cancel_button.style.display = "none";
    document.getElementById("blocker").style.display = "inline-block";

    document.getElementById("dialog_title").innerText = "About...";
    document.getElementById("about_panel").style.display = "inline-block";
    document.getElementById("dialog").style.display = "inline-block";

    ok_button.addEventListener('click', close_dialog);

}

function show_getting_started_panel() {

    set_all_text_panel_display('none');

    cancel_button.style.display = "none";
    document.getElementById("blocker").style.display = "inline-block";

    document.getElementById("dialog_title").innerText = "Getting Started";
    document.getElementById("getting_started_panel").style.display = "inline-block";
    document.getElementById("dialog").style.display = "inline-block";

    ok_button.addEventListener('click', close_dialog);

}

function show_license_panel() {

    set_all_text_panel_display('none');

    cancel_button.style.display = "none";
    document.getElementById("blocker").style.display = "inline-block";

    document.getElementById("dialog_title").innerText = "License";
    document.getElementById("license_panel").style.display = "inline-block";
    document.getElementById("dialog").style.display = "inline-block";

    ok_button.addEventListener('click', close_dialog);

}

function set_all_text_panel_display(style_display) {
    var panel = document.getElementsByClassName('modal-scroll-panel');

    for (var i = 0; i < panel.length; ++i) {
        panel[i].style.display = style_display;
    }

}

function clear_image_display_area() {
    hide_all_canvas();
    set_all_text_panel_display('none');
}

/**
 * Strole the Local Image
 * @param {event} event the Event
 */
function store_local_img_ref(event) {
    var user_selected_images = event.target.files;
    var original_image_count = __img_count;

    // clear browser cache if user chooses to load new images
    if (original_image_count === 0) {
        __storage.remove_data_from_local();
    }

    var discarded_file_count = 0;

    for (var iFile = 0; iFile < user_selected_images.length; ++iFile) {
        var filetype = user_selected_images[iFile].type.substr(0, 5);

        if (filetype === 'image') {
            var filename = user_selected_images[iFile].name;
            var size = user_selected_images[iFile].size;
            var img_id = filename;

            if (__img_metadata.hasOwnProperty(img_id)) {
                if (!__img_metadata[img_id].fileref) {
                    __img_metadata[img_id].fileref = user_selected_images[iFile];
                    __image_id_list.push(img_id);
                    __loaded_img_fn_list.push(filename);
                }

            } else {
                __img_metadata[img_id] = new Metadata(user_selected_images[iFile],
                    filename,
                    size);
                __image_id_list.push(img_id);
                __loaded_img_fn_list.push(filename);
                __img_count += 1;
                __reload_img_fn_list_table = true;
            }
        } else {
            discarded_file_count += 1;
        }
    }

    if (__img_metadata) {
        var status_msg = 'Loaded ' + (__img_count - original_image_count) + ' images.';
        if (discarded_file_count) {
            status_msg += ' ( Discarded ' + discarded_file_count + ' non-image files! )';
        }
        show_message(status_msg);

        if (__image_index === -1) {
            __show_image(0);
        } else {
            __show_image(original_image_count);
        }
        __update_img_fn_list();
    } else {
        show_message("Please upload some image files!");
    }

}

function load_text_file(text_file, callback_function) {

    if (text_file) {
        var text_reader = new FileReader();
        text_reader.addEventListener('progress', function (e) {
            show_message('Loading data from text file : ' + text_file.name + ' ... ');
        }, false);

        text_reader.addEventListener('error', function () {
            show_message('Error loading data from text file :  ' + text_file.name + ' !');
            callback_function('');
        }, false);

        text_reader.addEventListener('load', function () {
            callback_function(text_reader.result);
        }, false);
        text_reader.readAsText(text_file, 'utf-8');
    }

}

/**
 * Show the Message in Text Area
 * @param {*} msg the Message
 * @param {*} t the Title
 */
function show_message(msg, t) {
    if (__message_clear_timer) {
        clearTimeout(__message_clear_timer); // stop any previous timeouts
    }
    var timeout = t;

    if (typeof t === 'undefined') {
        timeout = THEME_MESSAGE_TIMEOUT_MS;
    }

    document.getElementById('message_panel').innerHTML = msg;
    __message_clear_timer = setTimeout(function () {
        document.getElementById('message_panel').innerHTML = '&nbsp;';
    }, timeout);
}

/**
 * Show the Image at a particular index
 * 
 * @param {integer} image_index 
 */
function __show_image(image_index) {

    if (__is_loading_current_image) {
        return;
    }

    var img_id = __image_id_list[image_index];

    if (!__img_metadata.hasOwnProperty(img_id)) {
        return;
    }

    var img_filename = __img_metadata[img_id].filename;
    var img_reader = new FileReader();
    __is_loading_current_image = true;

    img_reader.addEventListener("loadstart", function (e) {
        __img_loading_spinbar(true);
    }, false);

    img_reader.addEventListener("progress", function (e) { }, false);

    img_reader.addEventListener("error", function () {
        __is_loading_current_image = false;
        __img_loading_spinbar(false);
        show_message(`Aborted loading image: ${img_filename}`);
    }, false);

    img_reader.addEventListener("abort", function () {
        __is_loading_current_image = false;
        __img_loading_spinbar(false);
        show_message(`Aborted loading image: ${img_filename}`);
    }, false);

    img_reader.addEventListener("load", function () {
        __current_image = new Image();

        __current_image.addEventListener("error", function () {
            __is_loading_current_image = false;
            __img_loading_spinbar(false);
            show_message(`Aborted loading image: ${img_filename}`);
        }, false);

        __current_image.addEventListener("abort", function () {
            __is_loading_current_image = false;
            __img_loading_spinbar(false);
            show_message(`Aborted loading image: ${img_filename}`);
        }, false);

        __current_image.addEventListener("load", function () {

            __image_id = img_id;
            __image_index = image_index;
            __is_current_image_loaded = true;
            __is_loading_current_image = false;
            __click_x0 = 0;
            __click_y0 = 0;
            __click_x1 = 0;
            __click_y1 = 0;
            __is_user_drawing_region = false;
            __is_window_resized = false;
            __is_user_resizing_region = false;
            __is_user_moving_region = false;
            __is_user_drawing_polygon = false;
            __is_region_selected = false;
            __user_sel_region_id = -1;
            __current_image_width = __current_image.naturalWidth;
            __current_image_height = __current_image.naturalHeight;

            // Set the Dimensions of the Image
            __img_metadata[__image_id].set_dimensions(__current_image.naturalWidth, __current_image.naturalHeight);

            // set the size of canvas
            // based on the current dimension of browser window
            var element = document.documentElement;
            var canvas_panel_width = element.clientWidth - 230;
            var canvas_panel_height = element.clientHeight - 2 * ui_top_panel.offsetHeight;
            __canvas_width = __current_image_width;
            __canvas_height = __current_image_height;

            if (__canvas_width > canvas_panel_width) {
                // resize image to match the panel width
                var scale_width = canvas_panel_width / __current_image.naturalWidth;
                __canvas_width = canvas_panel_width;
                __canvas_height = __current_image.naturalHeight * scale_width;
            }
            if (__canvas_height > canvas_panel_height) {
                // resize further image if its height is larger than the image panel
                var scale_height = canvas_panel_height / __canvas_height;
                __canvas_height = canvas_panel_height;
                __canvas_width = __canvas_width * scale_height;
            }
            __canvas_width = Math.round(__canvas_width);
            __canvas_height = Math.round(__canvas_height);
            __canvas_scale = __current_image.naturalWidth / __canvas_width;
            __canvas_scale_without_zoom = __canvas_scale;
            set_all_canvas_size(__canvas_width, __canvas_height);

            // ensure that all the canvas are visible
            clear_image_display_area();
            show_all_canvas();

            // we only need to draw the image once in the image_canvas
            __img_ctx.clearRect(0, 0, __canvas_width, __canvas_height);
            __img_ctx.drawImage(__current_image, 0, 0,
                __canvas_width, __canvas_height);


            __load_canvas_regions(); // image to canvas space transform
            __redraw_reg_canvas();

            // Set Focus
            __reg_canvas.focus();

            __img_loading_spinbar(false);

            // refresh the image list
            __reload_img_fn_list_table = true;
            __update_img_fn_list();
            __update_attributes_panel();

        });

        __current_image.src = img_reader.result;

    }, false);

    img_reader.readAsDataURL(__img_metadata[img_id].fileref);

}

/**
 * transform regions in image space to canvas space
 * 
 */
function __load_canvas_regions() {
    var regions = __img_metadata[__image_id].regions;
    __canvas_regions = [];

    for (var iRegion = 0; iRegion < regions.length; ++iRegion) {
        var region = new Region();

        for (var key in regions[iRegion].shape_attributes) {
            region.shape_attributes[key] = regions[iRegion].shape_attributes[key];
        }

        __canvas_regions.push(region);

        var decorator = new Decorator(__canvas_regions[iRegion]);

        decorator.rescale(regions[iRegion], __canvas_scale);

    }

}

/**
 * Select the Current region Shape
 * 
 * @param {*} sel_shape_name the Region Shape
 */
function select_region_shape(sel_shape_name) {
    for (var shape_name in REGION_SHAPE) {
        var ui_element = document.getElementById('region_shape_' + REGION_SHAPE[shape_name]);

        ui_element.classList.remove('selected');
    }

    __current_shape = sel_shape_name;
    var ui_element = document.getElementById('region_shape_' + __current_shape);
    ui_element.classList.add('selected');

    switch (__current_shape) {
        case REGION_SHAPE.RECT: // Fall-through
        case REGION_SHAPE.CIRCLE: // Fall-through
        case REGION_SHAPE.ELLIPSE:
            show_message('Press single click and drag mouse to draw ' +
                __current_shape + ' region');
            break;

        case REGION_SHAPE.POLYGON:
            __is_user_drawing_polygon = false;
            __current_polygon_region_id = -1;
            show_message('[Enter] to finish, [Esc] to cancel, ' +
                '[Click] to define polygon/polyline vertices')
            break;

        case REGION_SHAPE.POINT:
            show_message('Press single click to define points (or landmarks)');
            break;

    }

}

function set_all_canvas_size(w, h) {
    __img_canvas.height = h;
    __img_canvas.width = w;

    __reg_canvas.height = h;
    __reg_canvas.width = w;

}

function set_all_canvas_scale(s) {
    __img_ctx.scale(s, s);
    __reg_ctx.scale(s, s);
}

function show_all_canvas() {
    canvas_panel.style.display = 'inline-block';
}

function hide_all_canvas() {
    canvas_panel.style.display = 'none';
}

function jump_to_image(image_index) {

    if (__img_count <= 0) {
        return;
    }

    // reset zoom
    if (__is_canvas_zoomed) {
        __is_canvas_zoomed = false;
        __canvas_zoom_level_index = CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
        var zoom_scale = CANVAS_ZOOM_LEVELS[__canvas_zoom_level_index];
        set_all_canvas_scale(zoom_scale);
        set_all_canvas_size(__canvas_width, __canvas_height);
        __canvas_scale = __canvas_scale_without_zoom;
    }

    if (image_index >= 0 && image_index < __img_count) {
        __show_image(image_index);

    }

}

function count_missing_region_attr(img_id) {
    var miss_region_attr_count = 0;
    var attr_count = Object.keys(__region_attributes).length;
    for (var i = 0; i < __img_metadata[img_id].regions.length; ++i) {
        var set_attr_count = Object.keys(__img_metadata[img_id].regions[i].region_attributes).length;
        miss_region_attr_count += (attr_count - set_attr_count);
    }
    return miss_region_attr_count;
}

function set_selection(is_selected) {
    for (var i = 0; i < __canvas_regions.length; ++i) {
        __canvas_regions[i].is_user_selected = is_selected;
        __img_metadata[__image_id].regions[i].is_user_selected = is_selected;
    }
    __is_all_region_selected = is_selected;
}

function __toggle_all_regions_selection(is_selected) {

    for (var iRegion = 0; iRegion < __canvas_regions.length; ++iRegion) {
        __canvas_regions[iRegion].is_user_selected = is_selected;
        __img_metadata[__image_id].regions[iRegion].is_user_selected = is_selected;
    }

    __is_all_region_selected = is_selected;

}

function select_only_region(region_id) {

    __toggle_all_regions_selection(false);
    __set_region_select_state(region_id, true);
    __is_region_selected = true;
    __user_sel_region_id = region_id;

}

function __set_region_select_state(region_id, is_selected) {

    __canvas_regions[region_id].is_user_selected = is_selected;
    __img_metadata[__image_id].regions[region_id].is_user_selected = is_selected;

}

function show_annotation_data() {
    var hstr = '<pre>' + pack__metadata('csv').join('') + '</pre>';

    action_panel.innerHTML = hstr;
    set_all_text_panel_display('none');
    cancel_button.style.display = "none";

    document.getElementById("dialog_title").innerText = "Details";
    document.getElementById("blocker").style.display = "inline-block";
    document.getElementById("action_panel").style.display = "inline-block";
    document.getElementById("dialog").style.display = "inline-block";

    //add event listener
    ok_button.addEventListener('click', function (event) {
        close_model_panel();
    });

}

function __draw_region(offsetX, offsetY, shiftKey) {

    __click_x1 = offsetX;
    __click_y1 = offsetY;

    var click_dx = Math.abs(__click_x1 - __click_x0);
    var click_dy = Math.abs(__click_y1 - __click_y0);

    // indicates that user has finished moving a region
    if (__is_user_moving_region) {
        __is_user_moving_region = false;
        __reg_canvas.style.cursor = "default";

        var move_x = Math.round(__click_x1 - __region_click_x);
        var move_y = Math.round(__click_y1 - __region_click_y);

        if (Math.abs(move_x) > MOUSE_CLICK_TOL ||
            Math.abs(move_y) > MOUSE_CLICK_TOL) {

            var composer = new Composer(__canvas_regions[__user_sel_region_id],
                __img_metadata[__image_id].regions[__user_sel_region_id]);

            composer.Move(__canvas_scale, move_x, move_y);

        } else {
            var nested_region_id = Geometry.is_inside_regions(__canvas_regions, __click_x0, __click_y0, true);

            if (nested_region_id >= 0 &&
                nested_region_id !== __user_sel_region_id) {
                __user_sel_region_id = nested_region_id;
                __is_region_selected = true;
                __is_user_moving_region = false;

                // de-select all other regions if the user has not pressed Shift
                if (!shiftKey) {
                    __toggle_all_regions_selection(false);
                }

                __set_region_select_state(nested_region_id, true);
                __update_attributes_panel();

            }

        }

        __redraw_reg_canvas();
        __reg_canvas.focus();

        return;
    }

    // indicates that user has finished resizing a region
    if (__is_user_resizing_region) {
        __is_user_resizing_region = false;
        __reg_canvas.style.cursor = "default";

        // update the region
        var composer = new Composer(__canvas_regions[__user_sel_region_id],
            __img_metadata[__image_id].regions[__user_sel_region_id]);

        __toggle_all_regions_selection(false);
        __set_region_select_state(__user_sel_region_id, true);

        composer.Preserve_Aspect_Ratio(__is_ctrl_pressed);
        composer.Resize(__canvas_scale, __region_edge, __current_x, __current_y);

        __redraw_reg_canvas();
        __reg_canvas.focus();

        return;
    }

    // denotes a single click (= mouse down + mouse up)

    if (click_dx < MOUSE_CLICK_TOL ||
        click_dy < MOUSE_CLICK_TOL) {
        // if user is already drawing polygon, then each click adds a new point

        if (__is_user_drawing_polygon) {

            var canvas_x0 = Math.round(__click_x0);
            var canvas_y0 = Math.round(__click_y0);

            // check if the clicked point is close to the first point
            var fx0 = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'][0];
            var fy0 = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_y'][0];
            var dx = (fx0 - canvas_x0);
            var dy = (fy0 - canvas_y0);

            // @todo: add test for the inner area delimited by the enclosed polygon to have at least a minimum given value
            if (Math.sqrt(dx * dx + dy * dy) <= POLYGON_VERTEX_MATCH_TOL &&
                __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'].length >= 3) {
                // user clicked on the first polygon point to close the path and the polygon has at least 3 points defined

                __is_user_drawing_polygon = false;

                // add all polygon points stored in __canvas_regions[]
                var all_points_x = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'].slice(0);
                var all_points_y = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_y'].slice(0);

                // close path - this will make any final, polygon region to contain at least 4 points
                all_points_x.push(all_points_x[0]);
                all_points_y.push(all_points_y[0]);

                var canvas_all_points_x = [];
                var canvas_all_points_y = [];

                for (var iPoint = 0; iPoint < all_points_x.length; ++iPoint) {
                    all_points_x[iPoint] = Math.round(all_points_x[iPoint] * __canvas_scale);
                    all_points_y[iPoint] = Math.round(all_points_y[iPoint] * __canvas_scale);

                    canvas_all_points_x[iPoint] = Math.round(all_points_x[iPoint] / __canvas_scale);
                    canvas_all_points_y[iPoint] = Math.round(all_points_y[iPoint] / __canvas_scale);

                }

                var polygon_region = new Region();

                polygon_region.shape_attributes['name'] = 'polygon';
                polygon_region.shape_attributes['all_points_x'] = all_points_x;
                polygon_region.shape_attributes['all_points_y'] = all_points_y;
                __current_polygon_region_id = __img_metadata[__image_id].regions.length;
                __img_metadata[__image_id].regions.push(polygon_region);

                // update canvas
                __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'] = canvas_all_points_x;
                __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_y'] = canvas_all_points_y;

                // newly drawn region is automatically selected
                select_only_region(__current_polygon_region_id);

                __current_polygon_region_id = -1;

                __update_attributes_panel();


            } else {
                // user clicked on a new polygon point
                __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'].push(canvas_x0);
                __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_y'].push(canvas_y0);
            }
        } else {
            var region_id = Geometry.is_inside_regions(__canvas_regions, __click_x0, __click_y0);

            if (region_id >= 0) {
                // first click selects region
                __user_sel_region_id = region_id;
                __is_region_selected = true;
                __is_user_moving_region = false;
                __is_user_drawing_region = false;

                // de-select all other regions if the user has not pressed Shift
                if (shiftKey) {
                    __toggle_all_regions_selection(false);
                }

                __set_region_select_state(region_id, true);

                __update_attributes_panel();
                //show_message('Click and drag to move or resize the selected region');
            } else {
                if (__is_user_drawing_region) {
                    // clear all region selection
                    __is_user_drawing_region = false;
                    __is_region_selected = false;
                    __toggle_all_regions_selection(false);

                    __update_attributes_panel();
                } else {
                    switch (__current_shape) {

                        case REGION_SHAPE.POLYGON:
                            // user has clicked on the first point in a new polygon
                            __is_user_drawing_polygon = true;

                            var canvas_polygon_region = new Region();

                            canvas_polygon_region.shape_attributes['name'] = __current_shape;
                            canvas_polygon_region.shape_attributes['all_points_x'] = [Math.round(__click_x0)];
                            canvas_polygon_region.shape_attributes['all_points_y'] = [Math.round(__click_y0)];
                            __canvas_regions.push(canvas_polygon_region);
                            __current_polygon_region_id = __canvas_regions.length - 1;
                            break;

                        case REGION_SHAPE.POINT:
                            var canvas_point_region = new Region();
                            var image_point_region = new Region();

                            var composer = new Composer(canvas_point_region, image_point_region);

                            composer.Setup_Point(__click_x0, __click_y0, __current_shape, __canvas_scale);

                            __canvas_regions.push(canvas_point_region);
                            __img_metadata[__image_id].regions.push(image_point_region);
                            __toggle_all_regions_selection(false);

                            __update_attributes_panel();

                            break;

                    }

                }

            }

        }

        __redraw_reg_canvas();
        __reg_canvas.focus();

        return;

    }

    if (__is_user_drawing_region) {

        __is_user_drawing_region = false;

        var region_x0, region_y0, region_x1, region_y1;

        if (__click_x0 < __click_x1) {
            region_x0 = __click_x0;
            region_x1 = __click_x1;
        } else {
            region_x0 = __click_x1;
            region_x1 = __click_x0;
        }

        if (__click_y0 < __click_y1) {
            region_y0 = __click_y0;
            region_y1 = __click_y1;
        } else {
            region_y0 = __click_y1;
            region_y1 = __click_y0;
        }

        var original_img_region = new Region();
        var canvas_img_region = new Region();

        var region_dx = Math.abs(region_x1 - region_x0);
        var region_dy = Math.abs(region_y1 - region_y0);

        // newly drawn region is automatically selected
        __toggle_all_regions_selection(false);
        original_img_region.is_user_selected = true;
        canvas_img_region.is_user_selected = true;

        __is_region_selected = true;
        __user_sel_region_id = __canvas_regions.length; // new region's id

        if (region_dx > REGION_MIN_DIM || region_dy > REGION_MIN_DIM) {
            var composer = new Composer(canvas_img_region, original_img_region);

            composer.Setup(__current_shape, __canvas_scale, region_x0, region_y0, region_dx, region_dy);

            if (__current_shape != REGION_SHAPE.POLYGON) {
                __img_metadata[__image_id].regions.push(original_img_region);
                __canvas_regions.push(canvas_img_region);
                __update_attributes_panel();
            }

        } else {
            show_message('Prevented accidental addition of a very small region.');
        }

        __redraw_reg_canvas();
        __reg_canvas.focus();

        return;

    }

}

//
// Image click handlers
//

// enter annotation mode on double click
__reg_canvas.addEventListener('dblclick', (e) => {
    __click_x0 = e.offsetX;
    __click_y0 = e.offsetY;

    var region_id = Geometry.is_inside_regions(__canvas_regions, __click_x0, __click_y0);


}, false);

// user clicks on the canvas
__reg_canvas.addEventListener('mousedown', (e) => {

    __click_x0 = e.offsetX;
    __click_y0 = e.offsetY;
    __shift_key = e.shiftKey;
    __region_edge = Geometry.is_on_region_corner(__canvas_regions, __click_x0, __click_y0);

    var region_id = Geometry.is_inside_regions(__canvas_regions, __click_x0, __click_y0);

    if (__is_region_selected) {
        // check if user clicked on the region boundary
        if (__region_edge[1] > 0) {
            if (!__is_user_resizing_region) {
                // resize region
                if (__region_edge[0] !== __user_sel_region_id) {

                    __user_sel_region_id = __region_edge[0];
                    __is_region_selected = true;

                }

                __is_user_resizing_region = true;
            }

        } else {
            __toggle_all_regions_selection(false);

            var found = Geometry.is_inside_region(__canvas_regions,
                __click_x0,
                __click_y0,
                __user_sel_region_id);

            if (found) {

                if (!__is_user_moving_region) {
                    __is_user_moving_region = true;
                    __region_click_x = __click_x0;
                    __region_click_y = __click_y0;
                }

            }

            if (region_id === -1) {
                __is_user_drawing_region = (__current_shape != REGION_SHAPE.POLYGON && __current_shape !== REGION_SHAPE.POINT);

                // unselect all regions
                __is_region_selected = false;
                __user_sel_region_id = -1;
            }

        }

    } else {
        if (region_id === -1) {

            if (__current_shape !== REGION_SHAPE.POLYGON && __current_shape !== REGION_SHAPE.POINT) {
                __is_user_drawing_region = true;
            }
        }

    }

    e.preventDefault();

}, false);

__reg_canvas.addEventListener('mouseenter', function (e) { });

__reg_canvas.addEventListener('mouseleave', function (e) { });

__reg_canvas.addEventListener('mouseup', function (e) {

    __draw_region(e.offsetX, e.offsetY, e.shiftKey);

});

__reg_canvas.addEventListener("mouseover", function (e) {
    // change the mouse cursor icon
    __redraw_reg_canvas();
    __reg_canvas.focus();
});

__reg_canvas.addEventListener('mousemove', function (e) {

    if (!__is_current_image_loaded) {
        return;
    }

    if (__is_user_drawing_region && e.which == 0) {
        return;
    }

    __current_x = e.offsetX;
    __current_y = e.offsetY;

    if (__is_region_selected) {
        if (!__is_user_resizing_region) {
            // check if user moved mouse cursor to region boundary
            // which indicates an intention to resize the region

            __region_edge = Geometry.is_on_region_corner(__canvas_regions, __current_x, __current_y);

            if (__region_edge[0] === __user_sel_region_id) {
                switch (__region_edge[1]) {
                    // rect
                    case 1: // Fall-through // top-left corner of rect
                    case 3: // bottom-right corner of rect
                        __reg_canvas.style.cursor = "nwse-resize";
                        break;
                    case 2: // Fall-through // top-right corner of rect
                    case 4: // bottom-left corner of rect
                        __reg_canvas.style.cursor = "nesw-resize";
                        break;

                    case 5: // Fall-through // top-middle point of rect
                    case 7: // bottom-middle point of rect
                        __reg_canvas.style.cursor = "ns-resize";
                        break;
                    case 6: // Fall-through // top-middle point of rect
                    case 8: // bottom-middle point of rect
                        __reg_canvas.style.cursor = "ew-resize";
                        break;

                    // circle and ellipse
                    case 5:
                        __reg_canvas.style.cursor = "n-resize";
                        break;
                    case 6:
                        __reg_canvas.style.cursor = "e-resize";
                        break;

                    default:
                        __reg_canvas.style.cursor = "default";
                        break;
                }

                if (__region_edge[1] >= POLYGON_RESIZE_VERTEX_OFFSET) {
                    // indicates mouse over polygon vertex
                    __reg_canvas.style.cursor = "crosshair";
                }
            } else {
                var found = Geometry.is_inside_region(
                    __canvas_regions,
                    __current_x,
                    __current_y,
                    __user_sel_region_id);
                if (found) {
                    __reg_canvas.style.cursor = "move";
                } else {
                    __reg_canvas.style.cursor = "default";
                }
            }
        }
    }

    if (__is_user_drawing_region) {
        // draw region as the user drags the mouse cursor
        if (__canvas_regions.length) {
            __redraw_reg_canvas(); // clear old intermediate rectangle
        } else {
            // first region being drawn, just clear the full region canvas
            __reg_ctx.clearRect(0, 0, __reg_canvas.width, __reg_canvas.height);
        }

        var region_x0, region_y0;
        var region_id = __region_edge[0];
        var canvas = new Canvas(__painter);

        canvas.Paint(__current_shape, __current_x, __current_y, __click_x0, __click_y0);

        __reg_canvas.focus();

    }

    if (__is_user_resizing_region) {
        // user has clicked mouse on bounding box edge and is now moving it
        // draw region as the user drags the mouse coursor
        if (__canvas_regions.length) {
            __redraw_reg_canvas(); // clear old intermediate rectangle
        } else {
            // first region being drawn, just clear the full region canvas
            __reg_ctx.clearRect(0, 0, __reg_canvas.width, __reg_canvas.height);
        }

        var region_id = __region_edge[0];

        var preserve_aspect_ratio = false;
        if (__is_ctrl_pressed) {
            preserve_aspect_ratio = true;
        }

        var canvas = new Canvas(__painter);

        canvas.Resize(__region_edge,
            __canvas_regions[region_id].shape_attributes,
            __current_x,
            __current_y);

        __reg_canvas.focus();

    }

    if (__is_user_moving_region) {
        // draw region as the user drags the mouse coursor
        if (__canvas_regions.length) {
            __redraw_reg_canvas(); // clear old intermediate rectangle
        } else {
            // first region being drawn, just clear the full region canvas
            __reg_ctx.clearRect(0, 0, __reg_canvas.width, __reg_canvas.height);
        }

        var move_x = (__current_x - __region_click_x);
        var move_y = (__current_y - __region_click_y);
        var attr = __canvas_regions[__user_sel_region_id].shape_attributes;

        var canvas = new Canvas(__painter);

        canvas.Move(attr, move_x, move_y);

        __reg_canvas.focus();

        return;

    }

    if (__is_user_drawing_polygon) {

        __redraw_reg_canvas();

        var attr = __canvas_regions[__current_polygon_region_id].shape_attributes;
        var all_points_x = attr['all_points_x'];
        var all_points_y = attr['all_points_y'];
        var npts = all_points_x.length;

        var line_x = [all_points_x.slice(npts - 1), __current_x];
        var line_y = [all_points_y.slice(npts - 1), __current_y];

        __painter.draw_polygon_region(line_x, line_y, false);

    }
});


//
// Canvas update routines
//
function __redraw_img_canvas() {
    if (__is_current_image_loaded) {
        __img_ctx.clearRect(0, 0, __img_canvas.width, __img_canvas.height);
        __img_ctx.drawImage(__current_image, 0, 0,
            __img_canvas.width, __img_canvas.height);
    }
}

function __redraw_reg_canvas() {
    if (__is_current_image_loaded) {
        if (__canvas_regions.length > 0) {
            __reg_ctx.clearRect(0, 0, __reg_canvas.width, __reg_canvas.height);
            if (__is_region_boundary_visible) {
                draw_all_regions();
            }

            if (__is_region_id_visible) {
                draw_all_region_id();
            }
        }
    }
}

function __clear_reg_canvas() {
    __reg_ctx.clearRect(0, 0, __reg_canvas.width, __reg_canvas.height);
}

function draw_all_regions() {
    for (var iRegion = 0; iRegion < __canvas_regions.length; ++iRegion) {
        var attr = __canvas_regions[iRegion].shape_attributes;
        var is_selected = __canvas_regions[iRegion].is_user_selected;

        switch (attr['name']) {
            case REGION_SHAPE.RECT:
                __painter.draw_rect_region(attr['x'],
                    attr['y'],
                    attr['width'],
                    attr['height'],
                    is_selected);
                break;

            case REGION_SHAPE.CIRCLE:
                __painter.draw_circle_region(attr['cx'],
                    attr['cy'],
                    attr['r'],
                    is_selected);
                break;

            case REGION_SHAPE.ELLIPSE:
                __painter.draw_ellipse_region(attr['cx'],
                    attr['cy'],
                    attr['rx'],
                    attr['ry'],
                    is_selected);
                break;

            case REGION_SHAPE.POLYGON:
                __painter.draw_polygon_region(attr['all_points_x'],
                    attr['all_points_y'],
                    is_selected);
                break;

            case REGION_SHAPE.POINT:
                __painter.draw_point_region(attr['cx'],
                    attr['cy'],
                    is_selected);
                break;
        }

    }

}

function draw_all_region_id() {
    __reg_ctx.shadowColor = "transparent";

    for (var i = 0; i < __img_metadata[__image_id].regions.length; ++i) {
        var canvas_reg = __canvas_regions[i];

        var bbox = get_region_bounding_box(canvas_reg);
        var x = bbox[0];
        var y = bbox[1];
        var w = Math.abs(bbox[2] - bbox[0]);
        __reg_ctx.font = THEME_ATTRIBUTE_VALUE_FONT;

        var annotation_str = (i + 1).toString();
        var bgnd_rect_width = __reg_ctx.measureText(annotation_str).width * 2;

        var char_width = __reg_ctx.measureText('M').width;
        var char_height = 1.8 * char_width;

        var r = __img_metadata[__image_id].regions[i].region_attributes;
        if (Object.keys(r).length === 1 && w > (2 * char_width)) {
            // show the attribute value
            for (var key in r) {
                annotation_str = r[key];
            }
            var strw = __reg_ctx.measureText(annotation_str).width;

            if (strw > w) {
                // if text overflows, crop it
                var str_max = Math.floor((w * annotation_str.length) / strw);
                annotation_str = annotation_str.substr(0, str_max - 1) + '.';
                bgnd_rect_width = w;
            } else {
                bgnd_rect_width = strw + char_width;
            }
        }

        if (canvas_reg.shape_attributes['name'] === REGION_SHAPE.POLYGON) {
            // put label near the first vertex
            x = canvas_reg.shape_attributes['all_points_x'][0];
            y = canvas_reg.shape_attributes['all_points_y'][0];
        } else {
            // center the label
            x = x - (bgnd_rect_width / 2 - w / 2);
        }

        // first, draw a background rectangle first
        __reg_ctx.fillStyle = 'black';
        __reg_ctx.globalAlpha = 0.8;
        __reg_ctx.fillRect(Math.floor(x),
            Math.floor(y - 1.1 * char_height),
            Math.floor(bgnd_rect_width),
            Math.floor(char_height));

        // then, draw text over this background rectangle
        __reg_ctx.globalAlpha = 1.0;
        __reg_ctx.fillStyle = 'yellow';
        __reg_ctx.fillText(annotation_str,
            Math.floor(x + 0.4 * char_width),
            Math.floor(y - 0.35 * char_height));

    }

}

function get_region_bounding_box(region) {
    var d = region.shape_attributes;
    var bbox = new Array(4);

    switch (d['name']) {
        case 'rect':
            bbox[0] = d['x'];
            bbox[1] = d['y'];
            bbox[2] = d['x'] + d['width'];
            bbox[3] = d['y'] + d['height'];
            break;

        case 'circle':
            bbox[0] = d['cx'] - d['r'];
            bbox[1] = d['cy'] - d['r'];
            bbox[2] = d['cx'] + d['r'];
            bbox[3] = d['cy'] + d['r'];
            break;

        case 'ellipse':
            bbox[0] = d['cx'] - d['rx'];
            bbox[1] = d['cy'] - d['ry'];
            bbox[2] = d['cx'] + d['rx'];
            bbox[3] = d['cy'] + d['ry'];
            break;

        case 'polyline': // handled by polygon
        case 'polygon':
            var all_points_x = d['all_points_x'];
            var all_points_y = d['all_points_y'];

            var minx = Number.MAX_SAFE_INTEGER;
            var miny = Number.MAX_SAFE_INTEGER;
            var maxx = 0;
            var maxy = 0;
            for (var i = 0; i < all_points_x.length; ++i) {
                if (all_points_x[i] < minx) {
                    minx = all_points_x[i];
                }
                if (all_points_x[i] > maxx) {
                    maxx = all_points_x[i];
                }
                if (all_points_y[i] < miny) {
                    miny = all_points_y[i];
                }
                if (all_points_y[i] > maxy) {
                    maxy = all_points_y[i];
                }
            }
            bbox[0] = minx;
            bbox[1] = miny;
            bbox[2] = maxx;
            bbox[3] = maxy;
            break;

        case 'point':
            bbox[0] = d['cx'] - REGION_POINT_RADIUS;
            bbox[1] = d['cy'] - REGION_POINT_RADIUS;
            bbox[2] = d['cx'] + REGION_POINT_RADIUS;
            bbox[3] = d['cy'] + REGION_POINT_RADIUS;
            break;
    }
    return bbox;
}

/**
 * Event Listener - keyup
 * 
 * @param callback respond to the keyup
 * 
 */
window.addEventListener('keyup', function (e) {
    if (__is_user_updating_attribute_value ||
        __is_user_updating_attribute_name ||
        __is_user_adding_attribute_name) {

        return;
    }

    if (e.which === 17) { // Ctrl key
        __is_ctrl_pressed = false;
    }

});

/**
 * Event Listener - keydown
 * 
 * @param callback respond to the keyup
 * 
 */
window.addEventListener('keydown', function (e) {

    if (__input_focus) {
        return;
    }

    if (document.activeElement.id == 'cloud-token' || document.activeElement.id == 'cloud-container') {
        return;
    }

    if (__is_user_updating_attribute_value ||
        __is_user_updating_attribute_name ||
        __is_user_adding_attribute_name) {

        return;
    }

    // user commands
    if (e.ctrlKey) {
        __is_ctrl_pressed = true;

        if (e.which === 65) { // Ctrl + a
            sel_all_regions();
            e.preventDefault();
            return;
        }

        if (e.which === 67) { // Ctrl + c
            if (__is_region_selected ||
                __is_all_region_selected) {
                copy_sel_regions();
                e.preventDefault();
            }
            return;
        }

        if (e.which === 86) { // Ctrl + v
            paste_sel_regions();
            e.preventDefault();
            return;
        }
    }

    if (e.which === 46 || e.which === 8) { // Del or Backspace
        del_sel_regions();
        e.preventDefault();
    }
    if (e.which === 78 || e.which === 39) { // n or right arrow
        move_to_next_image();
        e.preventDefault();
        return;
    }
    if (e.which === 80 || e.which === 37) { // n or right arrow
        move_to_prev_image();
        e.preventDefault();
        return;
    }
    if (e.which === 32 && __is_current_image_loaded) { // Space
        toggle_img_list();
        e.preventDefault();
        return;
    }

    // zoom
    if (__is_current_image_loaded) {
        // see: http://www.javascripter.net/faq/keycodes.htm
        if (e.which === 61 || e.which === 187) { // + for zoom in
            if (e.shiftKey) {
                zoom_in();
            } else { // = for zoom reset
                reset_zoom_level();
            }
            return;
        }

        if (e.which === 173 || e.which === 189) { // - for zoom out
            zoom_out();
            return;
        }
    }

    if (e.which === 27) { // Esc
        if (__is_user_updating_attribute_value ||
            __is_user_updating_attribute_name ||
            __is_user_adding_attribute_name) {

            __is_user_updating_attribute_value = false;
            __is_user_updating_attribute_name = false;
            __is_user_adding_attribute_name = false;
        }

        if (__is_user_resizing_region) {
            // cancel region resizing action
            __is_user_resizing_region = false;
        }

        if (__is_region_selected) {
            // clear all region selections
            __is_region_selected = false;
            __user_sel_region_id = -1;
            __toggle_all_regions_selection(false);
        }

        if (__is_user_drawing_polygon) {
            __is_user_drawing_polygon = false;
            __canvas_regions.splice(__current_polygon_region_id, 1);
        }

        if (__is_user_drawing_region) {
            __is_user_drawing_region = false;
        }

        if (__is_user_resizing_region) {
            __is_user_resizing_region = false
        }

        if (__is_user_updating_attribute_name ||
            __is_user_updating_attribute_value) {
            __is_user_updating_attribute_name = false;
            __is_user_updating_attribute_value = false;

        }

        if (__is_user_moving_region) {
            __is_user_moving_region = false
        }

        __redraw_reg_canvas();
        __reg_canvas.focus();
        e.preventDefault();
        return;
    }

    if (e.which === 112) { // F1 for help
        show_getting_started_panel();
        e.preventDefault();
        return;
    }

    if (e.which === 113) { // F2 for about
        show_about_panel();
        e.preventDefault();
        return;
    }

    if (e.which === 13) { // Enter key
        if (__current_shape === REGION_SHAPE.POLYGON) {
            // [Enter] key is used to indicate completion of
            // polygon or polyline drawing action

            var npts = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'].length;
            if (npts <= 2 && __current_shape === REGION_SHAPE.POLYGON) {
                show_message('For a polygon, you must define at least 3 points. ' +
                    'Press [Esc] to cancel drawing operation.!');
                return;
            }

            __is_user_drawing_polygon = false;
            add_new_polygon();

            // newly drawn region is automatically selected
            select_only_region(__current_polygon_region_id);

            __current_polygon_region_id = -1;
            __redraw_reg_canvas();
            __reg_canvas.focus();

        }

    }

});

function add_new_polygon() {
    var all_points_x = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'].slice(0);
    var all_points_y = __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_y'].slice(0);

    if (__current_shape === REGION_SHAPE.POLYGON) {
        // close path of the polygon (the user need not connect the final vertex)
        // hence all polygons will have at least 4 points
        all_points_x.push(all_points_x[0]);
        all_points_y.push(all_points_y[0]);
    }

    var canvas_all_points_x = [];
    var canvas_all_points_y = [];

    //var points_str = '';
    for (var i = 0; i < all_points_x.length; ++i) {
        all_points_x[i] = Math.round(all_points_x[i] * __canvas_scale);
        all_points_y[i] = Math.round(all_points_y[i] * __canvas_scale);

        canvas_all_points_x[i] = Math.round(all_points_x[i] / __canvas_scale);
        canvas_all_points_y[i] = Math.round(all_points_y[i] / __canvas_scale);
    }

    var polygon_region = new Region();
    polygon_region.shape_attributes['name'] = __current_shape;
    polygon_region.shape_attributes['all_points_x'] = all_points_x;
    polygon_region.shape_attributes['all_points_y'] = all_points_y;
    __current_polygon_region_id = __img_metadata[__image_id].regions.length;
    __img_metadata[__image_id].regions.push(polygon_region);

    // update canvas
    __canvas_regions[__current_polygon_region_id].shape_attributes['name'] = __current_shape;
    __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_x'] = canvas_all_points_x;
    __canvas_regions[__current_polygon_region_id].shape_attributes['all_points_y'] = canvas_all_points_y;
}

function del_sel_regions() {

    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }

    var del_region_count = 0;
    if (__is_all_region_selected) {
        del_region_count = __canvas_regions.length;
        __canvas_regions.splice(0);
        __img_metadata[__image_id].regions.splice(0);
    } else {
        var sorted_sel_reg_id = [];
        for (var i = 0; i < __canvas_regions.length; ++i) {
            if (__canvas_regions[i].is_user_selected) {
                sorted_sel_reg_id.push(i);
            }
        }
        sorted_sel_reg_id.sort(function (a, b) {
            return (b - a);
        });
        for (var i = 0; i < sorted_sel_reg_id.length; ++i) {
            __canvas_regions.splice(sorted_sel_reg_id[i], 1);
            __img_metadata[__image_id].regions.splice(sorted_sel_reg_id[i], 1);
            del_region_count += 1;
        }
    }

    __is_all_region_selected = false;
    __is_region_selected = false;
    __user_sel_region_id = -1;

    if (__canvas_regions.length === 0) {
        __clear_reg_canvas();
    } else {
        __redraw_reg_canvas();
    }

    __update_attributes_panel();
    __reg_canvas.focus();

    show_message('Deleted ' + del_region_count + ' selected regions');
}

function sel_all_regions() {
    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }

    __toggle_all_regions_selection(true);
    __is_all_region_selected = true;
    __redraw_reg_canvas();
}

function copy_sel_regions() {

    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }

    if (__is_region_selected ||
        __is_all_region_selected) {
        __copied_image_regions.splice(0);
        for (var i = 0; i < __img_metadata[__image_id].regions.length; ++i) {
            var img_region = __img_metadata[__image_id].regions[i];
            var canvas_region = __canvas_regions[i];
            if (canvas_region.is_user_selected) {
                __copied_image_regions.push(img_region.clone());
            }
        }

        show_message(`Copied ${__copied_image_regions.length} selected regions. Press Ctrl + v to paste`);

    } else {
        show_message('Select a region first!');
    }
}

function paste_sel_regions() {

    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }

    if (__copied_image_regions.length) {
        var pasted_reg_count = 0;
        for (var i = 0; i < __copied_image_regions.length; ++i) {
            // ensure copied the regions are within this image's boundaries
            var bbox = get_region_bounding_box(__copied_image_regions[i]);
            if (bbox[2] < __current_image_width &&
                bbox[3] < __current_image_height) {
                var r = __copied_image_regions[i].clone();

                __img_metadata[__image_id].regions.push(r);

                pasted_reg_count += 1;
            }
        }
        __load_canvas_regions();
        var discarded_reg_count = __copied_image_regions.length - pasted_reg_count;
        show_message('Pasted ' + pasted_reg_count + ' regions. ' +
            'Discarded ' + discarded_reg_count + ' regions exceeding image boundary.');
        __redraw_reg_canvas();
        __reg_canvas.focus();
    } else {
        show_message('To paste a region, you first need to select a region and copy it!');
    }
}

function move_to_prev_image() {
    if (__img_count > 0) {
        __is_region_selected = false;
        __user_sel_region_id = -1;

        if (__is_canvas_zoomed) {
            __is_canvas_zoomed = false;
            __canvas_zoom_level_index = CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
            var zoom_scale = CANVAS_ZOOM_LEVELS[__canvas_zoom_level_index];
            set_all_canvas_scale(zoom_scale);
            set_all_canvas_size(__canvas_width, __canvas_height);
            __canvas_scale = __canvas_scale_without_zoom;
        }

        var current_img_index = __image_index;
        if (__image_index === 0) {
            __show_image(__img_count - 1);
        } else {
            __show_image(__image_index - 1);
        }

        if (typeof __hook_prev_image === 'function') {
            __hook_prev_image(current_img_index);
        }

    }

}

function move_to_next_image() {
    if (__img_count > 0) {
        __is_region_selected = false;
        __user_sel_region_id = -1;

        if (__is_canvas_zoomed) {
            __is_canvas_zoomed = false;
            __canvas_zoom_level_index = CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;
            var zoom_scale = CANVAS_ZOOM_LEVELS[__canvas_zoom_level_index];
            set_all_canvas_scale(zoom_scale);
            set_all_canvas_size(__canvas_width, __canvas_height);
            __canvas_scale = __canvas_scale_without_zoom;
        }

        var current_img_index = __image_index;
        if (__image_index === (__img_count - 1)) {
            __show_image(0);
        } else {
            __show_image(__image_index + 1);
        }

        if (typeof __hook_next_image === 'function') {
            __hook_next_image(current_img_index);
        }

    }

}

function reset_zoom_level() {
    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }
    if (__is_canvas_zoomed) {
        __is_canvas_zoomed = false;
        __canvas_zoom_level_index = CANVAS_DEFAULT_ZOOM_LEVEL_INDEX;

        var zoom_scale = CANVAS_ZOOM_LEVELS[__canvas_zoom_level_index];
        set_all_canvas_scale(zoom_scale);
        set_all_canvas_size(__canvas_width, __canvas_height);
        __canvas_scale = __canvas_scale_without_zoom;

        __load_canvas_regions(); // image to canvas space transform
        __redraw_img_canvas();
        __redraw_reg_canvas();
        __reg_canvas.focus();
        show_message('Zoom reset');
    } else {
        show_message('Cannot reset zoom because image zoom has not been applied!');
    }
}

function zoom_in() {
    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }

    if (__canvas_zoom_level_index === (CANVAS_ZOOM_LEVELS.length - 1)) {
        show_message('Further zoom-in not possible');
    } else {
        __canvas_zoom_level_index += 1;

        __is_canvas_zoomed = true;
        var zoom_scale = CANVAS_ZOOM_LEVELS[__canvas_zoom_level_index];
        set_all_canvas_scale(zoom_scale);
        set_all_canvas_size(__canvas_width * zoom_scale,
            __canvas_height * zoom_scale);
        __canvas_scale = __canvas_scale_without_zoom / zoom_scale;

        __load_canvas_regions(); // image to canvas space transform
        __redraw_img_canvas();
        __redraw_reg_canvas();
        __reg_canvas.focus();
        show_message('Zoomed in to level ' + zoom_scale + 'X');

    }

}

function zoom_out() {
    if (!__is_current_image_loaded) {
        show_message('First load some images!');
        return;
    }

    if (__canvas_zoom_level_index === 0) {
        show_message('Further zoom-out not possible');
    } else {
        __canvas_zoom_level_index -= 1;

        __is_canvas_zoomed = true;
        var zoom_scale = CANVAS_ZOOM_LEVELS[__canvas_zoom_level_index];
        set_all_canvas_scale(zoom_scale);
        set_all_canvas_size(__canvas_width * zoom_scale,
            __canvas_height * zoom_scale);
        __canvas_scale = __canvas_scale_without_zoom / zoom_scale;

        __load_canvas_regions(); // image to canvas space transform
        __redraw_img_canvas();
        __redraw_reg_canvas();
        __reg_canvas.focus();

        show_message('Zoomed out to level ' + zoom_scale + 'X');

    }
}

function resize_image_list() {
    var window_height = document.documentElement.clientHeight;
    var top_panel_height = document.getElementById('ui_top_panel').offsetHeight;
    var region_shape_selection_panel_height = document.getElementById('region_shape_selection_panel').offsetHeight;
    var keyboard_shortcuts_panel_height = document.getElementById('keyboard_shortcuts_panel').offsetHeight;
    var img_fn_list = document.getElementById('img_fn_list');
    var img_fn_list_height = window_height - top_panel_height - region_shape_selection_panel_height - keyboard_shortcuts_panel_height - 164;

    img_fn_list_height = img_fn_list_height < 32 ? 32 : img_fn_list_height;

    img_fn_list.style.height = `${window_height - top_panel_height - region_shape_selection_panel_height - keyboard_shortcuts_panel_height - 164}px`;

}

function toggle_region_boundary_visibility() {
    __is_region_boundary_visible = !__is_region_boundary_visible;
    __redraw_reg_canvas();
    __reg_canvas.focus();
}

function toggle_region_id_visibility() {
    __is_region_id_visible = !__is_region_id_visible;
    __redraw_reg_canvas();
    __reg_canvas.focus();
}

//
// Mouse wheel event listener
//
window.addEventListener('wheel', function (e) {
    if (!__is_current_image_loaded) {
        return;
    }

    if (e.ctrlKey) {
        if (e.deltaY < 0) {
            zoom_in();
        } else {
            zoom_out();
        }
    }

});

//
// Handlers for attributes input panel (spreadsheet like user input panel)
//
function attr_input_focus(region) {

    __input_focus = true;

    select_only_region(region);

    __redraw_reg_canvas();

    var nodes = document.getElementsByClassName('tag-row');
    const elements = Array.prototype.slice.call(nodes);

    elements.forEach(element => {

        if (element.id.slice(1) == region) {

            if (element.id == `_${region}`) {
                element.style.backgroundColor = 'rgba(0,0,255,0.2)';
            } else if (element.id == `@${region}`) {
                element.style.backgroundColor = '#f2f2f2';
            }

        } else {
            element.style.backgroundColor = 'rgb(255, 255, 255)';
        }

    });

    __is_user_updating_attribute_value = true;

}

function attr_input_blur(region) {

    __input_focus = false;

}

/**
 * Update the Tag Attribute Panel
 * 
 * @param {*} type the Type of Panel
 * @param {*} panel the Panel
 * @param {*} col_headers the Column Headers
 * @param {*} data the Data 
 * @param {*} row_names the Row Names
 */
function init_Spread_Sheet_input(type, panel, col_headers, data, row_names) {
    var attributes_panel = document.getElementById(panel);

    if (typeof row_names === 'undefined') {
        var row_names = [];
        for (var iRegion = 0; iRegion < data.length; ++iRegion) {
            row_names[iRegion] = iRegion + 1;
        }
    }

    var attrtable = document.createElement('table');

    attrtable.setAttribute('id', 'region_attributes_table');

    // if multiple regions are selected, show the selected regions first
    var sel_reg_list = [];
    var remaining_reg_list = [];
    var all_reg_list = [];
    var region_traversal_order = [];

    for (var iRegion = 0; iRegion < data.length; ++iRegion) {
        all_reg_list.push(iRegion);

        if (data[iRegion].is_user_selected) {
            sel_reg_list.push(iRegion);
        } else {
            remaining_reg_list.push(iRegion);
        }

    }


    var sel_rows = [];

    for (var iRegion = 0; iRegion < data.length; ++iRegion) {

        var row = attrtable.insertRow(-1);

        var iRow = iRegion;

        // if multiple regions are selected, show the selected regions first
        var cell;

        var regionIdCell = row.insertCell(0);

        regionIdCell.innerHTML = '' + row_names[iRow] + '';
        regionIdCell.setAttribute('id', `_${iRegion}`);
        regionIdCell.setAttribute('class', 'tag-row');
        regionIdCell.style.fontWeight = 'bold';
        regionIdCell.style.fontSize = 'x-small';
        regionIdCell.style.width = '8em';

        var input_id = `#${iRegion}`;
        var ip_val = "";

        if (__img_metadata[__image_id].regions[iRegion].region_attributes["tag"] != null) {
            ip_val = __img_metadata[__image_id].regions[iRegion].region_attributes["tag"];
        }

        row.insertCell(-1).innerHTML = '<input type="text"' +
            ' id="' + input_id + '"' +
            ' value="' + ip_val + '"' +
            ' autocomplete="on"' +
            ' oninput="update_attribute_value(\'' + input_id + '\', this.value)"' +
            ' onblur="attr_input_blur(' + iRow + ')"' +
            ' onfocus="attr_input_focus(' + iRow + ');" />';

        row.setAttribute('id', `@${iRegion}`);
        row.setAttribute('class', 'tag-row');

        if (data[iRow].is_user_selected) {
            regionIdCell.style.backgroundColor = 'rgba(0,0,255,0.2)';
            row.style.backgroundColor = '#f2f2f2';
            sel_rows.push(row);

        }

    }

    if (document.getElementById('region_attributes_table') != null) {
        attributes_panel.replaceChild(attrtable, document.getElementById('region_attributes_table'));
    } else {
        attributes_panel.appendChild(attrtable);
    }

    // move vertical scrollbar automatically to show the selected region (if any)

    if (sel_rows.length === 1) {
        var panelHeight = attributes_panel.offsetHeight;
        var sel_row_bottom = sel_rows[0].offsetTop + sel_rows[0].clientHeight;
        if (sel_row_bottom > panelHeight) {
            attributes_panel.scrollTop = sel_rows[0].offsetTop;
        } else {
            attributes_panel.scrollTop = 0;
        }
    } else {
        attributes_panel.scrollTop = 0;
    }

}

function __update_attributes_panel() {

    if (__is_current_image_loaded) {
        update_region_attributes_input_panel();
    }

}

function update_region_attributes_input_panel() {

    init_Spread_Sheet_input('region_attributes',
        'region_content_panel',
        __region_attributes,
        __img_metadata[__image_id].regions);

}

// this vertical spacer is needed to allow scrollbar to show
// items like Keyboard Shortcut hidden under the attributes panel
function update_vertical_space() {
    var panel = document.getElementById('vertical_space');
    panel.style.height = attributes_panel.offsetHeight + 'px';
}

function update_attribute_value(attr_id, value) {
    var attr_id_split = attr_id.split('#');
    var region_id = attr_id_split[1];

    __img_metadata[__image_id].regions[region_id].region_attributes["tag"] = value;

    if (__is_reg_attr_panel_visible) {
        __set_region_select_state(region_id, false);
    }

    __redraw_reg_canvas();
    __is_user_updating_attribute_value = false;

}

function change_attribute(type, old_attribute_name, new_attribute_name) {

    switch (type) {
        case 'r': // region attribute

            if (__region_attributes.hasOwnProperty(old_attribute_name)) {
                delete __region_attributes[old_attribute_name];
                __region_attributes[new_attribute_name] = true;
            }

            rename_region_attribute(old_attribute_name, new_attribute_name);
            update_region_attributes_input_panel();
            break;
    }

}

function add_new_attribute(type, attribute_name) {
    switch (type) {
        case 'r': // region attribute
            if (!__region_attributes.hasOwnProperty(attribute_name)) {
                __region_attributes[attribute_name] = true;
            }
            update_region_attributes_input_panel();
            break;

    }

    __is_user_adding_attribute_name = false;

}

function rename_region_attribute(old_attribute_name, new_attribute_name) {

    for (var iImage in __img_metadata) {

        for (var iRegion in __img_metadata[iImage].regions) {

            if (__img_metadata[iImage].regions[iRegion].region_attributes.hasOwnProperty(old_attribute_name)) {
                var value = __img_metadata[iImage].regions[iRegion].region_attributes[old_attribute_name];
                delete __img_metadata[iImage].regions[iRegion].region_attributes[old_attribute_name];

                __img_metadata[iImage].regions[iRegion].region_attributes[new_attribute_name] = value;

            }
        }
    }

}

/**
 * Toggle the accordian panel
 * 
 * @param {*} event
 */
function toggle_accordion_panel(e) {
    e.classList.toggle('active');
    e.nextElementSibling.classList.toggle('show');

    resize_image_list();

}

function toggle_leftsidebar() {
    var leftsidebar = document.getElementById('leftsidebar');

    if (leftsidebar.style.display === 'none') {
        leftsidebar.style.display = 'table-cell';
        document.getElementById('leftsidebar_collapse_button').innerHTML =
            '<div class="fa fa-angle-double-left fa-1x bottom-icon"><div>';
        document.getElementById('canvas_panel').style.left = '295px';
    } else {
        leftsidebar.style.display = 'none';
        document.getElementById('leftsidebar_collapse_button').innerHTML =
            '<div class="fa fa-angle-double-right fa-1x bottom-icon"><div>';
        document.getElementById('canvas_panel').style.left = '17px';
    }
}

function toggle_rightsidebar() {
    var rightsidebar_panel = document.getElementById('rightsidebar_panel');

    if (rightsidebar_panel.style.display === 'none') {
        rightsidebar_panel.style.display = 'inline-block';
        document.getElementById('rightsidebar_collapse_button').innerHTML =
            '<div class="fa fa-angle-double-right fa-1x bottom-icon"><div>';
        document.getElementById('canvas_panel').style.right = '250px';
    } else {
        rightsidebar_panel.style.display = 'none';
        document.getElementById('rightsidebar_collapse_button').innerHTML =
            '<div class="fa fa-angle-double-left fa-1x bottom-icon"><div>';
        document.getElementById('canvas_panel').style.right = '17px';
    }
}

function init_leftsidebar_accordion() {
    var acc = document.getElementsByClassName('leftsidebar_accordion');
    var iPanel;

    for (iPanel = 0; iPanel < acc.length; ++iPanel) {

        acc[iPanel].addEventListener('click', function () {
            this.classList.toggle('active');
            var panel = this.nextElementSibling;
            if (panel.classList.contains('show')) {
                panel.classList.remove('show');
            } else {
                panel.classList.add('show');
            }

            resize_image_list();

        });
    }
}

function is_img_fn_list_visible() {
    return img_fn_list_panel.classList.contains('show');
}

function __img_loading_spinbar(show) {
    if (is_img_fn_list_visible()) {
        var panel = document.getElementById('loaded_img_panel_title');
        if (show) {
            panel.innerHTML = 'Loaded Images &nbsp;&nbsp;<div class="loading_spinbox"></div>';
        } else {
            panel.innerHTML = 'Loaded Images &nbsp;&nbsp;';
        }
    }
}

/**
 * Update the Image List
 */
function __update_img_fn_list() {
    var regex = document.getElementById('img_fn_list_regex').value;

    if (regex === '' || regex === null) {
        __loaded_img_fn_list_table_html = [];
        __loaded_img_fn_list_file_index = [];

        __loaded_img_fn_list_table_html.push('<ul>');

        var width = 240;

        for (var iImage = 0; iImage < __loaded_img_fn_list.length; ++iImage) {
            var filename = __loaded_img_fn_list[iImage];
            var filename_width = Math.floor(__metrics.getTextWidth(filename, 'normal 8pt sans-serif'));

            width = filename_width > width ? filename_width : width;

        }

        for (var iImage = 0; iImage < __loaded_img_fn_list.length; ++iImage) {
            __loaded_img_fn_list_table_html.push(__generate_entry_html(iImage, width));
            __loaded_img_fn_list_file_index.push(iImage);
        }
        __loaded_img_fn_list_table_html.push('</ul>');

    } else {
        img_fn_list_generate_html(regex);
    }

    img_fn_list.innerHTML = __loaded_img_fn_list_table_html.join('');
    img_fn_list_scroll_to_current_file();

}

function img_fn_list_onfocus() {

    __input_focus = true;

}

function img_fn_list_onblur() {

    __input_focus = false;

}

function img_fn_list_onregex() {
    img_fn_list_generate_html(document.getElementById('img_fn_list_regex').value);
    img_fn_list.innerHTML = __loaded_img_fn_list_table_html.join('');
    img_fn_list_scroll_to_current_file();
}

function check_image_inclusion(file_name) {

    __img_metadata[file_name].include_in_archive = document.getElementById(`select-${file_name}`).checked;

}

function __generate_entry_html(iImage, width) {
    var html = '';
    var filename = __loaded_img_fn_list[iImage];
    var attributes = __img_metadata[filename];

    var checked = (attributes.include_in_archive ? 'checked' : '');

    if (iImage === __image_index) {
        // highlight the current entry
        html += `<li id="flist${iImage}" style="display:block; cursor: default; height:22px;">`;
        html += `<label class="container" style="margin-left:3px; position:relative; text-align:bottom; top:2px; color:rgba(0,0,0,1.0);">`;
        html += `<input type="checkbox" style="width:16px; height:16px;" id="select-${filename}" name="${filename}" value="${filename}" onclick="check_image_inclusion('${filename}');" ${checked}>`;
        html += `<span class="checkmark"></span>`;
        html += `</label>`;
        html += `<label style="position:relative; text-align:bottom; top:2px; color:rgba(0,0,0,1.0);">`;
        html += `<span style="position:relative; top:2px;">${filename}</span>`;
        html += `</label>`;

    } else {
        html += `<li id="flist${iImage}" onclick="jump_to_image(${iImage})" style="display:block; cursor: default; height:22px;">`;
        html += `<label class="container" style="margin-left:3px; position:relative; top:2px; color:rgba(0,0,0,0.6);">`;
        html += `<input type="checkbox" style="width:16px; height:16px;" id="select-${filename}" name="${filename}" value="${filename}" onclick="check_image_inclusion('${filename}');" ${checked}>`;
        html += `<span class="checkmark"></span>`
        html += `</label>`;
        html += `<label style="position:relative; top:2px; color:rgba(0,0,0,0.6);">`;
        html += `<span style="position:relative; top:2px;">${filename}</span>`;
        html += `</label>`;
    }

    html += '</li>';

    return html;
}

function img_fn_list_generate_html(regex) {
    __loaded_img_fn_list_table_html = [];
    __loaded_img_fn_list_file_index = [];
    __loaded_img_fn_list_table_html.push('<ul>');

    for (var iImage = 0; iImage < __loaded_img_fn_list.length; ++iImage) {
        var filename = __loaded_img_fn_list[iImage];

        if (filename.match(regex) !== null) {
            __loaded_img_fn_list_table_html.push(__generate_entry_html(iImage));
            __loaded_img_fn_list_file_index.push(iImage);
        }

    }

    __loaded_img_fn_list_table_html.push('</ul>');

}

function img_fn_list_scroll_to_current_file() {
    if (__loaded_img_fn_list_file_index.includes(__image_index)) {
        var sel_file = document.getElementById('flist' + __image_index);
        var panel_height = img_fn_list.clientHeight;
        if (sel_file.offsetTop > (img_fn_list.scrollTop + panel_height)) {
            img_fn_list.scrollTop = sel_file.offsetTop;
        }
    }
}

function toggle_img_fn_list_visibility() {
    document.getElementById('img_fn_list_panel').classList.toggle('show');
    document.getElementById('loaded_img_panel_title').classList.toggle('active');
}