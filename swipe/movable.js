(function($) {
    /**
     * Movable plugin. Makes element movable horizontally
     *
     * @param {jQuery} $el
     * @param {{borders}} options
     * @constructor
     */
    var Movable = function($el, options) {
        var self = this,
            defaults = {
                borders: true
            },
            settings = $.extend({}, defaults, options),
            previousClientX;

        this.el = $el;

        this.getLeft = function() {
            return parseInt(this.el.css("left"), 10);
        };

        this.setLeft = function(left) {
            this.el.css("left", left + "px");
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
            return _.last(event.originalEvent.touches);
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

    $.fn.movable = function(options) {
        this.each(function(i, el) {
            new Movable($(el), options);
        });

        return this;
    };
})(jQuery);

$(function() {
    $('.movable').movable();
});
