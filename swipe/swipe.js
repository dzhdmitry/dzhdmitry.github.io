var report = (function() {
    var $container = $('#report-container');

    return function report(items) {
        var $els = $([]),
            onePercent = _.max(items) / 100;

        _.each(items, function(item) {
            var $el = $('<div class="report-item" />'),
                height = onePercent * item;

            $el.height(height).attr('title', height).tooltip();

            $els = $els.add($el);
        });

        $container.empty().append($els);
    }
})();

(function($) {
    var Recorder = function() {
        this.items = [];
        this.lastItem = null;

        this.add = function(item) {
            if (this.lastItem) {
                this.items.push(item - this.lastItem);
            }

            this.lastItem = item;
        };

        this.clear = function() {
            this.items = [];
            this.lastItem = null;
        };
    };

    var Pannable = function($el) {
        var self = this,
            previousClientX;

        this.el = $el;
        this.recorder = new Recorder();

        this.getLeft = function() {
            return parseInt(this.el.css("left"), 10);
        };

        this.setLeft = function(left) {
            this.el.css("left", left + "px");
        };

        this.changeLeft = function(offset) {
            this.setLeft(this.getLeft() + offset);
        };

        this.getLastTouch = function(event) {
            return _.last(event.originalEvent.touches);
        };

        this.el.on('touchstart', function(e) {
            var touch = self.getLastTouch(e);

            previousClientX = touch.clientX;
        }).on('touchmove', function(e) {
            var touch = self.getLastTouch(e),
                offset = touch.clientX - previousClientX;

            self.changeLeft(offset);
            self.recorder.add(e.timeStamp);

            previousClientX = touch.clientX;
        }).on('touchend', function(e) {
            self.recorder.add(e.timeStamp);
            report(self.recorder.items);
            self.recorder.clear();
        });
    };

    $.fn.pannable = function() {
        this.each(function(i, el) {
            new Pannable($(el));
        });

        return this;
    };
})(jQuery);

$(function() {
    $('.swipe').pannable();
});
