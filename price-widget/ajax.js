(function() {
    var FORMAT_SERVER = "MM/DD/YYYY";

    var ajaxSettings = {
        REQUEST_DELAY: {
            min: 500,
            max: 2000
        },
        actions: {
            '/property/1/prices': getPrices,
            '/property/2/prices': getPrices
        }
    };

    function getPrices(data) {
        var day = moment(data.start, FORMAT_SERVER);
        var response = [
            {type: "poa",       currency: "$", price: 205, discount: 0},
            {type: "poa",       currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 0},
            {type: "available", currency: "$", price: 205, discount: 15},
            {type: "available", currency: "$", price: 205, discount: 15},
            {type: "available", currency: "$", price: 205, discount: 15},

            {type: "sold",      currency: "$", price: 205, discount: 0},
            {type: "sold",      currency: "$", price: 205, discount: 0},
            {type: "sold",      currency: "$", price: 205, discount: 0},
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
            var model = _.extend({}, item, {
                id: day.format(FORMAT_SERVER)
            });

            day.add(1, 'days');

            return model;
        }).slice(0, data.size);
    }

    $.ajax = function(options) {
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

            this.report = function(status, options, response) {
                var base = status;

                if (status == 200) {
                    var method = _.has(options, "type") ? options.type : "get";

                    base = method.toUpperCase();
                }

                var out = [base, options.url];

                if (options.data) {
                    out.push(options.data);
                }

                if (response) {
                    out.push(response);
                }

                console.log.apply(console, out);
            };

            this.__run__ = function() {
                var data,
                    self = this;

                if (_.has(options, "beforeSend") && _.isFunction(options.beforeSend)) {
                    options.beforeSend.call(promise);
                }

                if (_.has(options, "url") && _.has(ajaxSettings.actions, options.url)) {
                    data = ajaxSettings.actions[options.url].call(null, options.data);

                    _.delay(function() {
                        if (_.isUndefined(data)) {
                            if (_.isFunction(fail)) {
                                fail.call(self);
                            }

                            self.report(500, options);
                        } else {
                            if (_.isFunction(done)) {
                                done.call(self, data);
                            }

                            self.report(200, options, data);
                        }

                        if (_.isFunction(always)) {
                            always.call(self);
                        }
                    }, _.random(ajaxSettings.REQUEST_DELAY.min, ajaxSettings.REQUEST_DELAY.max));
                } else {
                    if (_.isFunction(fail)) {
                        fail.call(self);
                    }

                    self.report(404, options);
                }

                return this;
            };
        };

        var promise = new Promise();

        return promise.__run__();
    };

    $.ajax.set = function(option, value) {
        if (_.isObject(option)) {
            ajaxSettings = _.extend({}, ajaxSettings, option);
        } else {
            ajaxSettings[option] = value;
        }
    };
})();
