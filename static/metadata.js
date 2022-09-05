function Metadata(fileref, filename, size) {
    this.size = size;

    if (fileref != null) {
        this.fileref = fileref;         // image url or local file ref.
    }

    this.regions = [];
    this.file_attributes = {};          // image Attributes
    this.dimensions = {}                // image Dimensions

    this.include_in_archive = true;

}

Metadata.prototype.get_dimensions = function() {

    return this.dimensions;

}    

Metadata.prototype.set_dimensions = function(width, height) {

     this.dimensions = {
        width: width,
        height: height
    }

}

Metadata.prototype.add_regions = function(regions) {

    for (var iRegion in regions) {
        let region = new Region();

        region.set_attributes(regions[iRegion]);
        this.add_region(region);

    }

}

Metadata.prototype.add_region = function (region) {
    this.regions.push(region);
}

Metadata.prototype.update_attributes = (attribute_names) => {

    for (var iRegion in this.regions) {

        this.regions[iRegion].update_attributes(attribute_names);

    }

}
