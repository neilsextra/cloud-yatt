function Storage(key) {

    this.key = key;

}

/**
 * Is the data local
 * 
 * @return 'true' id there is, 'false' otherwise
 */
Storage.prototype.is_data_in_local = function() {
    return localStorage.getItem('timestamp') &&
           localStorage.getItem(this.key);
}

/**
 * Remove the Bounding Box Data from Local Storage
 * 
 */
Storage.prototype.remove_data_from_local = function() {

    if (this.is_data_in_local()) {
        localStorage.removeItem('timestamp');
        localStorage.removeItem(this.key);
    }

}

/**
 * Download the Storage
 * 
 */
Storage.prototype.download_local_data = function() {
    var saved_date = new Date(localStorage.getItem('timestamp'));
    var localStorage_data_blob = new Blob([localStorage.getItem(this.key)],
        { type: 'text/json;charset=utf-8' });

    this.save_data_to_local_file(localStorage_data_blob, 'browser_cache_' + saved_date + '.json');

}

/**
 * Download local to sale
 * 
 * @param data the Data
 * 
 */
Storage.prototype.save_data_to_local_file = function (data, filename) {
    var anchor = document.createElement('a');

    anchor.href = URL.createObjectURL(data);
    anchor.target = '_blank';
    anchor.download = filename;

    // simulate a mouse click event
    var event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });

    anchor.dispatchEvent(event);

}

