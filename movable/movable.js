(function($) {
    /**
     * Movable plugin. Makes element movable horizontally
     *
     * @param {jQuery} $el
     * @param {{borders, method}} options
     * @constructor
     */
    var Movable = function($el, options) {
        var self = this,
            settings = $.extend({}, Plugin.defaults, options),
            previousClientX;

        this.el = $el;

        switch (settings.method) {
            case Plugin.METHOD_POSITION:
                this.property = "left";

                break;
            case Plugin.METHOD_MARGIN:
                this.property = "marginLeft";

                break;
            default:
                throw new Error("`" + settings.method + "` is not valid method");
        }

        this.getLeft = function() {
            return parseInt(this.el.css(this.property), 10);
        };

        this.setLeft = function(left) {
            this.el.css(this.property, left + "px");
        };

        this.move = function(offset) {
            var left = this.getLeft(),
                newLeft = left + offset;

            if (settings.borders) {
                var parentWidth = this.el.parent().width();

                if (newLeft > 0) {
                    newLeft = 0;
                } else if (left + parentWidth >= 0) {
                    var diff = newLeft + parentWidth;

                    if (diff < 0) {
                        newLeft -= diff;
                    }
                }
            }

            this.setLeft(newLeft);
        };

        this.getLastTouch = function(event) {
            return event.originalEvent.touches[0];
        };

        this.el.on('touchstart', function(e) {
            var touch = self.getLastTouch(e);

            e.preventDefault();

            previousClientX = touch.clientX;
        }).on('touchmove', function(e) {
            var touch = self.getLastTouch(e),
                offset = touch.clientX - previousClientX;

            e.preventDefault();
            self.move(offset);

            previousClientX = touch.clientX;
        }).on('touchend', function(e) {
            e.preventDefault();
        });
    };

    var Plugin = function(options) {
        this.each(function(i, el) {
            new Movable($(el), options);
        });

        return this;
    };

    $.extend(Plugin, {
        METHOD_POSITION: "position",
        METHOD_MARGIN: "margin",
        defaults: {
            borders: true,
            method: "position"
        }
    });

    $.fn.movable = Plugin;
})(jQuery);

$(function() {
    $('.movable').movable();
});
