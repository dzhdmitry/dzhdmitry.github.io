(function($) {
    /**
     * Drop zone file upload
     *
     * @param {{onUnsupported, onDragOver, onDragLeave, onDrop}} options
     * @returns {jQuery}
     */
    $.fn.dragZone = function(options) {
        var settings = $.extend({
            onUnsupported: function() {},
            onDragOver: function() {},
            onDragLeave: function() {},
            onDrop: function() {}
        }, options);

        if (typeof(window.FileReader) == 'undefined') {
            settings.onUnsupported.call(this);
        } else {
            this.each(function(i, zone) {
                var $zone = $(zone);

                zone.ondragover = function(e) {
                    settings.onDragOver.call($zone, e);

                    return false;
                };

                zone.ondragleave = function(e) {
                    settings.onDragLeave.call($zone, e);

                    return false;
                };

                zone.ondrop = function(e) {
                    e.preventDefault();

                    settings.onDrop.call($zone, e);
                };
            });
        }

        return this;
    }
})(jQuery);

/**
 * Status alert handler
 *
 * @param {jQuery} $el
 * @constructor
 */
var Status = function($el) {
    this.$el = $el;

    var defaultText = this.$el.html();

    this.update = function(text) {
        this.$el.html(text);
    };

    this.setDefault = function() {
        this.update(defaultText);
    };
};
