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
            var rawLeft = parseInt(this.el.css(this.property), 10);

            return (rawLeft) ? rawLeft : 0;
        };

        this.setLeft = function(left) {
            this.el.css(this.property, left + "px");
        };

        this.move = function(offset) {
            var left = this.getLeft(),
                newLeft = left + offset;

            if (settings.borders) {
                var maxLeft = 0;

                if (newLeft > maxLeft) {
                    newLeft = maxLeft;
                } else {
                    var minLeft = this.el.parent().width() - this.el.width();

                    if (newLeft < minLeft) {
                        newLeft = minLeft;
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

            previousClientX = touch.clientX;
        }).on('touchmove', function(e) {
            var touch = self.getLastTouch(e),
                offset = touch.clientX - previousClientX,
                event = jQuery.Event("move.moving");

            e.preventDefault();
            self.move(offset);

            previousClientX = touch.clientX;
            event.originalEvent = e;

            self.el.trigger(event);
        });

        this.el.data("movable-plugin", this);
    };

    var Plugin = function(options) {
        if (typeof options == "string") {
            var movable = this.data("movable-plugin");

            if (_.has(movable, options)) {
                return movable[options]();
            }
        } else {
            this.each(function(i, el) {
                new Movable($(el), options);
            });
        }

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
