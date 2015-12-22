$_ajax = function(options) {
    var REQUEST_DELAY = {
        min: 500,
        max: 2000
    };

    var actions = {
        getNext14days: function(data) {
            var parts = data.after.split("/");
            var response = [
                {dayOfWeek: "Mon", month: "Dec", type: "poa",       currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Tue", month: "Dec", type: "poa",       currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Wed", month: "Dec", type: "available", currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Thu", month: "Dec", type: "available", currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Fri", month: "Dec", type: "available", currency: "$", price: 205, discount: 15},
                {dayOfWeek: "Sat", month: "Dec", type: "available", currency: "$", price: 205, discount: 15},
                {dayOfWeek: "Sun", month: "Dec", type: "available", currency: "$", price: 205, discount: 15},

                {dayOfWeek: "Mon", month: "Dec", type: "poa",       currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Tue", month: "Dec", type: "poa",       currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Wed", month: "Dec", type: "available", currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Thu", month: "Dec", type: "available", currency: "$", price: 205, discount: 0},
                {dayOfWeek: "Fri", month: "Dec", type: "available", currency: "$", price: 205, discount: 15},
                {dayOfWeek: "Sat", month: "Dec", type: "available", currency: "$", price: 205, discount: 15},
                {dayOfWeek: "Sun", month: "Dec", type: "available", currency: "$", price: 205, discount: 15}
            ];

            var startDay = {
                day: parseInt(parts[0], 10),
                month: parseInt(parts[1], 10),
                year: parseInt(parts[2], 10)
            };

            return _.map(response, function(item) {
                startDay.day++;

                return _.extend({}, item, {
                    day: startDay.day,
                    year: startDay.year
                });
            });
        }
    };

    var Promise = function() {
        var done,
            fail,
            always;

        this.done = function(callback) {
            done = callback;

            return this;
        };

        this.fail = function(callback) {
            fail = callback;

            return this;
        };

        this.always = function(callback) {
            always = callback;

            return this;
        };

        this.__run__ = function() {
            var data,
                self = this;

            if (_.has(options, "beforeSend") && _.isFunction(options.beforeSend)) {
                options.beforeSend.call(promise);
            }

            if (_.has(options, "url") && _.has(actions, options.url)) {
                data = actions[options.url].call(null, options.data);
            }

            _.delay(function() {
                if (_.isUndefined(data)) {
                    if (_.isFunction(fail)) {
                        fail.call(self);
                    }
                } else {
                    if (_.isFunction(done)) {
                        done.call(self, data);
                    }
                }

                if (_.isFunction(always)) {
                    always.call(self);
                }
            }, _.random(REQUEST_DELAY.min, REQUEST_DELAY.max));

            return this;
        }
    };

    var promise = new Promise();

    return promise.__run__();
};
