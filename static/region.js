function Region() {
    this.is_user_selected = false;
    this.shape_attributes = {};      // region shape attributes
    this.region_attributes = {};     // region attributes
}

Region.prototype.set_attributes = function (metadata) {
    this.region_attributes = metadata.region_attributes;
    this.shape_attributes = metadata.shape_attributes;
}

Region.prototype.update_attributes = function (attribute_names) {

    let attributes = this.region_attributes;

    for (var attribute in attributes) {
        if (!attribute_names.hasOwnProperty(attribute)) {
            attribute_names[attribute] = true;
        }

    }

}


Region.prototype.clone = function() {

    function clone_value(value) {

        if (typeof(value) === 'object') {
            if (Array.isArray(value)) {
                return value.slice(0);
            } else {
                var copy = {};
                for (var p in value) {
                    if (value.hasOwnProperty(p)) {
                        copy[p] = clone_value(value[p]);
                    }
                }
                return copy;
            }
        }
    
        return value;
    
    }
    
    var region = new Region();
    
    region.is_user_selected = this.is_user_selected;

    // copy shape attributes
    for (var key in this.shape_attributes) {
        region.shape_attributes[key] = clone_value(this.shape_attributes[key]);
    }

    // copy region attributes
    for (var key in this.region_attributes) {
        region.region_attributes[key] = clone_value(this.region_attributes[key]);
    }
    
    return region;

}