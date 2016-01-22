$(function() {
    if (!_.has(window, "PriceWidget")) {
        throw new Error("PriceWidget must be loaded");
    }

    var Day = PriceWidget.Day.extend({
        defaults: function() {
            var defaults = Day.__super__.defaults.call(this);

            return _.extend({}, defaults, {
                checkbox: true,
                isChecked: false,
                isActive: false
            });
        },
        isChecked: function() {
            return this.get("isChecked");
        },
        toJSON: function() {
            return _.extend(Day.__super__.toJSON.call(this), {
                finalPrice: this.getFinalPrice()
            });
        },
        /**
         * Get price according to checked days
         *
         * @returns {Number}
         */
        getFinalPrice: function() {
            var finalPrice = this.get("price"),
                checked = this.collection.checked();

            if (checked.length) {
                _.each(this.get("prices"), function(price) {
                    if (checked.length >= price.nights) {
                        finalPrice = price.price;
                    }
                });
            }

            return finalPrice;
        },
        /**
         * Get max nights for all prices of a day
         *
         * @returns {Number}
         */
        getMaxNights: function() {
            if (this.isType("available")) {
                var maxNights = 1;

                _.each(this.get("prices"), function(price) {
                    if (price.nights > maxNights) {
                        maxNights = price.nights;
                    }
                });

                return maxNights;
            } else {
                return 0;
            }
        }
    });

    var DayView = PriceWidget.DayView.extend({
        template: _.getTemplate('day-booking-template'),
        events: {
            'mouseenter': "mouseEnter",
            'mouseleave': "mouseLeave",
            'change input[type="checkbox"]': "checked"
        },
        checked: function(e) {
            var currentPosition = 0,
                from,
                to,
                currentModel = this.model,
                collection = currentModel.collection,
                isChecked = $(e.currentTarget).prop("checked"),
                currentPassed = false,
                checkedBefore = [],
                checkedAfter = [];

            function isCurrentModel(model) {
                return model.id == currentModel.id;
            }

            function setIfOther(model, modelChecked) {
                if (!isCurrentModel(model)) {
                    model.set("isChecked", modelChecked);
                }
            }

            currentModel.set("isChecked", isChecked);

            // Checking state of all days
            collection.each(function(model, i) {
                if (isCurrentModel(model)) {
                    currentPassed = true;
                    currentPosition = i;
                } else {
                    if (currentPassed) { // after current
                        if (model.isChecked()) {
                            if (isChecked) {
                                if (_.isUndefined(to)) {
                                    // `to` is first day of selection after current day, `from` is current
                                    to = i;
                                }
                            } else {
                                checkedAfter.push(i);
                            }
                        }
                    } else { // before current
                        if (model.isChecked()) {
                            if (isChecked) {
                                // `from` is day after last checked day before current, `to` is current
                                from = i + 1;
                            } else {
                                checkedBefore.push(i);
                            }
                        }
                    }
                }
            });

            if (isChecked) {
                // Merge checked with current
                var prevIndex,
                    gapFound = false;

                if (_.isUndefined(from)) { // No one checked before
                    from = currentPosition;
                }

                if (_.isUndefined(to)) {
                    to = currentPosition;
                }

                if (to != currentPosition || from != currentPosition) {
                    // Search for empty days/`.day-loading` between selection and current day
                    var days,
                        previousDate;

                    if (to <= currentPosition) { // There is a selection before
                        days = collection.slice(from - 1, currentPosition + 1);
                    } else if (from >= currentPosition) { // There is a selection after
                        days = collection.slice(currentPosition, to + 1);
                    }

                    _.each(days, function(model) {
                        if (previousDate && model.get("date").diff(previousDate, 'days') > 1) {
                            // Empty days/`.day-loading` found
                            gapFound = true;
                        }

                        previousDate = model.get("date");
                    });
                }

                if (!gapFound) {
                    // Search for sold or poa days (cannot be selected)
                    _.each(collection.slice(from, to), function(model) {
                        if (model.isType("sold") || model.isType("poa")) {
                            gapFound = true;
                        } else {
                            setIfOther(model, true);
                        }

                        prevIndex = collection.indexOf(model);
                    });
                }

                if (gapFound) { // actually any unavailable checkbox
                    collection.each(function(model) {
                        setIfOther(model, isCurrentModel(model));
                    });
                }
            } else {
                // Detect which part (left/right) is smaller and uncheck it
                if (checkedBefore.length < checkedAfter.length) {
                    from = _.first(checkedBefore);
                    to = _.last(checkedBefore) + 1;
                } else {
                    from = _.first(checkedAfter);
                    to = _.last(checkedAfter) + 1;
                }

                if (!_.isUndefined(from) && !_.isUndefined(to)) {
                    _.each(collection.slice(from, to), function(model) {
                        setIfOther(model, false);
                    });
                }
            }

            collection.each(function(model) {
                // Update final price on all days
                if (!isCurrentModel(model)) {
                    model.view.render();
                }
            });

            collection.selectionChanged();
            collection.widget.model.trigger("change");
        }
    });

    var DayCollection = PriceWidget.DayCollection.extend({
        view: DayView,
        model: Day,
        /**
         * Get days from currently active to next Longer stay discount
         *
         * @returns {Number}
         */
        daysToNextDiscount: function() {
            var active = this.active(),
                lastPrice;

            _.find(active, function(day) {
                var firstPriceOfDay = _.find(day.get("prices"), function(price) {
                    return price.nights > active.length;
                });

                if (firstPriceOfDay) {
                    lastPrice = firstPriceOfDay;

                    return true; // Stop _.find on other days
                } else {
                    return false;
                }
            });

            if (lastPrice) {
                return lastPrice.nights - active.length;
            } else {
                return 0;
            }
        },
        /**
         * Get days to maximum discount available for current active days
         *
         * @returns {Number}
         */
        daysToMaxDiscount: function() {
            var active = this.active(),
                daysToMaxDiscount = 0;

            _.each(active, function(day) {
                var diff = day.getMaxNights() - active.length;

                if (diff > daysToMaxDiscount) {
                    daysToMaxDiscount = diff;
                }
            });

            return daysToMaxDiscount;
        },
        /**
         * Booking is allowed if user checked more then or equal to minNights for a property
         *
         * @returns {Boolean}
         */
        bookingAllowed: function() {
            var checked = this.where({isChecked: true});

            return checked.length >= this.widget.model.get("minNights");
        },
        selectionChanged: function() {
            var bookingAllowed = this.bookingAllowed();

            this.each(function(day) {
                day.set('isActive', bookingAllowed ? day.isChecked() : false);
            });
        },
        /**
         * Get all currently active days
         *
         * @returns {Day[]} days with `isActive`=true
         */
        active: function() {
            return this.where({isActive: true});
        },
        /**
         * Get all currently checked days
         *
         * @returns {Day[]} days with `isChecked`=true
         */
        checked: function() {
            return this.where({isChecked: true});
        }
    });

    var Widget = PriceWidget.Widget.extend({
        //
    });

    var WidgetView = PriceWidget.AbstractWidgetView.extend({
        initialize: function(options) {
            var self = this;

            WidgetView.__super__.initialize.call(this, options);

            this.listenTo(this.model, 'change', function() {
                self.container.trigger('prices.change', self);
            });
        },
        render: function() {
            WidgetView.__super__.render.call(this);

            this.model.days = new DayCollection(this.model.get("days"), {
                widget: this
            });

            return this;
        }
    });

    var plugin = _.extend({}, PriceWidget.plugin, {
        initialize: function(options) {
            var view = new WidgetView({
                model: new Widget(options),
                container: this
            });

            return PriceWidget.insertPlugin(this, view);
        }
    });

    /**
     * Booking Price Widget
     *
     * Methods:
     *   `widget` $(el).bookingPriceWidget("widget") returns current widget
     *
     * Events:
     *   [PriceWidget events]
     *   `prices.change` (event, widgetView) Triggers when prices selection changed
     *
     * @param {Object|String} method Plugin method or options for Widget model. See Widget.defaults()
     * @returns {$|jQuery}
     */
    $.fn.bookingPriceWidget = function(method) {
        var parameters = _.toArray(arguments);

        if (_.has(plugin, method)) {
            return plugin[method].apply(this, parameters.slice(1));
        } else if (_.isObject(method)) {
            return plugin.initialize.apply(this, parameters);
        } else {
            $.error("Invalid options for $.fn.bookingPriceWidget");
        }
    };
});
