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
         * @param {String} first
         * @param {Array} days
         */
        this.checkDays = function(first, days) {
            var date = moment(first, this.FORMAT_SERVER);

            _.each(days, function(day) {
                expect(day.id).toBe(date.format(self.FORMAT_SERVER));
                date.add(1, "days");
            });
        };

        /**
         * Assert `day` and `page` properties of priceWidget
         *
         * @param {Number} day
         * @param {Number} page
         */
        this.expectDayAndPage = function(day, page) {
            expect(this.widget.day).toBe(day);
            expect(this.widget.page).toBe(page);
        };

        /**
         * Assert amount od days in widget
         *
         * @param {Number} length
         */
        this.expectDaysAmount = function(length) {
            expect(this.days.length).toBe(length);
        };

        /**
         * Assert consistency of days:
         * Check length of days
         * Check id`s of each day
         *
         * @param {Number} length
         * @param {String} first Id [date] of first day
         */
        this.expectConsistency = function(length, first) {
            this.expectDaysAmount(length);
            this.checkDays(first, this.days.models);
        };

        /**
         * Assert consistency of days
         * Take arrays of [<startDate>, <size>]
         * Example: .expectConsistencyBlocks(["04/08/2016", 21], ...)
         */
        this.expectConsistencyBlocks = function() {
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

                self.checkDays(start, self.days.slice(from, size));
            });
        };

        this.expectCurrentDay = function(expected) {
            var current = this.widget.day;

            expect(this.days.at(current).id).toBe(expected);
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
