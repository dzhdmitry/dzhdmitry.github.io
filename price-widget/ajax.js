$_ajax = function(options) {
    var FORMAT_SERVER = "MM/DD/YYYY";
    var REQUEST_DELAY = {
        min: 500,
        max: 2000
    };

    var actions = {
        get14days: function(data) {
            var day = moment(data.after, FORMAT_SERVER);
            var response = [
                {type: "poa",       currency: "$", price: 205, discount: 0},
                {type: "poa",       currency: "$", price: 205, discount: 0},
                {type: "available", currency: "$", price: 205, discount: 0},
                {type: "available", currency: "$", price: 205, discount: 0},
                {type: "available", currency: "$", price: 205, discount: 15},
                {type: "available", currency: "$", price: 205, discount: 15},
                {type: "available", currency: "$", price: 205, discount: 15},

                {type: "poa",       currency: "$", price: 205, discount: 0},
                {type: "poa",       currency: "$", price: 205, discount: 0},
                {type: "available", currency: "$", price: 205, discount: 0},
                {type: "available", currency: "$", price: 205, discount: 0},
                {type: "available", currency: "$", price: 205, discount: 15},
                {type: "available", currency: "$", price: 205, discount: 15},
                {type: "available", currency: "$", price: 205, discount: 15}
            ];

            return _.map(response, function(item) {
                day.add(1, 'days');

                return _.extend({}, item, {
                    id: day.format("MM/DD/YYYY")
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
                console.log("GET", options.url, options.data);

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
