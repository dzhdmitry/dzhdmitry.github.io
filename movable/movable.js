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
                if (newLeft > settings.left) {
                    newLeft = settings.left;
                } else {
                    var minLeft = this.el.parent().width() - this.el.width() - settings.right;

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

        this.set = function(option, value) {
            if (_.isObject(option)) {
                settings = _.extend({}, settings, option);
            } else {
                settings[option] = value;
            }
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

    var Plugin = function(method) {
        var parameters = _.toArray(arguments);

        if (typeof method == "string") {
            var movable = this.data("movable-plugin");

            if (_.has(movable, method)) {
                return movable[method].apply(movable, parameters.slice(1));
            }
        } else {
            this.each(function(i, el) {
                new Movable($(el), method);
            });
        }

        return this;
    };

    $.extend(Plugin, {
        METHOD_POSITION: "position",
        METHOD_MARGIN: "margin",
        defaults: {
            borders: true,
            method: "position",
            left: 0,
            right: 0
        }
    });

    $.fn.movable = Plugin;
})(jQuery);

$(function() {
    $('.movable').movable().eq(0).movable("set", {
        left: -20,
        right: -20
    });
});
