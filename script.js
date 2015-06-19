var getGeoposition = (function() {
    var defaults = {
        options: {},
        before: function() {},
        success: function() {},
        error: function() {},
        complete: function() {},
        onUnavailable: function() {}
    };

    /**
     * Get Geoposition
     *
     * @param {Object} options
     *  - options: {Object} Options for navigator.geolocation.getCurrentPosition
     *  - before: {Function} Before requesting permission and/or making request
     *  - success: {Function} Success callback. Takes Geoposition object as argument
     *  - error: {Function} Error callback. Takes PositionError object as argument
     *  - complete: {Function} Complete callback
     *  - onUnavailable: {Function} When navigator.geolocation property is unavailable
     */
    return function getGeoposition(options) {
        var settings = $.extend({}, defaults, options),
            completed = false;

        function complete() {
            if (!completed) {
                completed = true;

                settings.complete.apply(this);
            }
        }

        if (navigator.geolocation) {
            settings.before();

            navigator.geolocation.getCurrentPosition(function() {
                settings.success.apply(this, arguments);
                complete();
            }, function() {
                settings.error.apply(this, arguments);
                complete();
            }, settings.options);
        } else {
            settings.onUnavailable();
        }
    };
})();
