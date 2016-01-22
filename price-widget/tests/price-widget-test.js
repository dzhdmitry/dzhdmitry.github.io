var PriceWidgetTest = (function() {
    /**
     * Testing functionality for priceWidgets
     *
     * @param {{widget, FORMAT_SERVER}} options
     * @constructor
     */
    var Test = function(options) {
        var self = this;

        this.FORMAT_SERVER = options.FORMAT_SERVER;
        this.widget = options.widget;
        this.days = priceWidgetToday.model.days;

        this.buttons = {
            forward: options.widget.$('a.widget-action-forward').eq(0),
            backward: options.widget.$('a.widget-action-backward').eq(0),
            fastForward: options.widget.$('a.widget-action-fast-forward').eq(0),
            fastBackward: options.widget.$('a.widget-action-fast-backward').eq(0)
        };

        /**
         * Check days have proper IDs
         *
         * @param assert
         * @param {String} first
         * @param {Array} days
         */
        this.checkDays = function(assert, first, days) {
            var date = moment(first, this.FORMAT_SERVER);

            _.each(days, function(day) {
                assert.equal(day.id, date.format(self.FORMAT_SERVER));
                date.add(1, "days");
            });
        };

        /**
         * Assert `day` and `page` properties of priceWidget
         *
         * @param assert
         * @param {Number} day
         * @param {Number} page
         */
        this.assertDayAndPage = function(assert, day, page) {
            assert.equal(this.widget.day, day, "Current day is valid");
            assert.equal(this.widget.page, page, "Current page is valid");
        };

        /**
         * Assert amount od days in widget
         *
         * @param assert
         * @param {Number} length
         */
        this.assertDaysAmount = function(assert, length) {
            assert.equal(this.days.length, length, "Days amount is valid");
        };

        /**
         * Assert consistency of days:
         * Check length of days
         * Check id`s of each day
         *
         * @param assert
         * @param {Number} length
         * @param {String} first Id [date] of first day
         */
        this.assertConsistency = function(assert, length, first) {
            this.assertDaysAmount(assert, length);
            this.checkDays(assert, first, this.days.models);
        };

        /**
         * Assert consistency of days
         * Take arrays of [<startDate>, <size>]
         * Example: .expectConsistencyBlocks(["04/08/2016", 21], ...)
         *
         * @param assert
         */
        this.assertConsistencyBlocks = function(assert) {
            var blocks = _.toArray(arguments);

            _.each(blocks, function(block) {
                if (block.length !== 2) {
                    throw new Error("Block must have 2 elements: startDate and size");
                }

                var start = block[0],
                    size = block[1],
                    first = self.days.get(start);

                if (!first) {
                    throw new Error("Day with id `" + start + "` not found in days");
                }

                var from = self.days.indexOf(first);

                self.checkDays(assert, start, self.days.slice(from, size));
            });
        };

        this.assertContainerPosition = function(assert, offset) {
            //
        };
    };

    Test.fixtures = function(start, size) {
        var DATA = [
            {type: "poa",       currency: "$", price: 205, discount: 0},
            {type: "poa",       currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 15},
            {type: "available", currency: "$", price: 205, discount: 15},
            {type: "available", currency: "$", price: 205, discount: 15},

            {type: "sold",      currency: "$", price: 205, discount: 0},
            {type: "sold",      currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 15},
            {type: "available", currency: "$", price: 205, discount: 15},
            {type: "available", currency: "$", price: 205, discount: 15}
        ];

        var FORMAT_SERVER = PriceWidget.Day.formats.SERVER,
            day = start.clone();

        //

        DATA = _.map(DATA, function(item) {
            var id = day.format(FORMAT_SERVER);

            day.add(1, 'days');

            return _.extend({}, item, {
                id: id,
                prices: [
                    {nights:2, price:205, original:205, isCurrent:true},
                    {nights:3, price:200, original:200, isCurrent:false},
                    {nights:4, price:190, original:190, isCurrent:false}
                ]
            });
        });

        return DATA;
    };

    return Test;
})();
