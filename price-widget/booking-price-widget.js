$(function() {
    if (!_.has(window, "PriceWidget")) {
        throw new Error("PriceWidget must be loaded");
    }

    var Day = PriceWidget.Day.extend({
        defaults: function() {
            return _.extend({}, Day.__super__.defaults.call(this), {
                checkbox: true
            });
        }
    });

    var DayView = PriceWidget.DayView.extend({
        events: {
            'mouseenter': "mouseEnter",
            'mouseleave': "mouseLeave",
            'change input[type="checkbox"]': "checked"
        },
        checked: function(e) {
            var currentPosition,
                from,
                to,
                currentModel = this.model,
                collection = currentModel.collection,
                isChecked = $(e.currentTarget).prop("checked"),
                currentPassed = false,
                checkedBefore = [],
                checkedAfter = [];

            currentModel.set("isChecked", isChecked);

            collection.each(function(model, i) {
                if (model.id == currentModel.id) {
                    currentPassed = true;
                    currentPosition = i;
                } else {
                    if (currentPassed) { // after current
                        if (model.get("isChecked")) {
                            if (isChecked) {
                                if (_.isUndefined(to)) {
                                    to = i;
                                }
                            } else {
                                checkedAfter.push(i);
                            }
                        }
                    } else { // before current
                        if (model.get("isChecked")) {
                            if (isChecked) {
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
                var soldFound = false;

                if (_.isUndefined(from)) {
                    from = currentPosition + 1;
                }

                if (_.isUndefined(to)) {
                    to = currentPosition;
                }

                _.each(collection.slice(from, to), function(model) {
                    if (model.get("type") == "sold" || model.get("type") == "poa") {
                        soldFound = true;
                    } else {
                        model.set("isChecked", isChecked);
                    }
                });

                if (soldFound) { // actually any unavailable checkbox
                    collection.each(function(model) {
                        model.set("isChecked", (model.id == currentModel.id));
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
                        model.set("isChecked", isChecked);
                    });
                }
            }

            collection.selectionChanged();
            collection.widget.lazyChange();
        }
    });

    var DayCollection = PriceWidget.DayCollection.extend({
        view: DayView,
        model: Day,
        selectionChanged: function() {
            var checked = this.where({isChecked: true}),
                isActive = checked.length >= this.widget.get("minDays");

            this.each(function(day) {
                day.set('isActive', isActive ? day.get('isChecked') : false);
            });
        }
    });

    var Widget = PriceWidget.Widget.extend({
        lazyChange: _.debounce(function() {
            this.trigger('change');
        }, 2000)
    });

    var WidgetView = PriceWidget.AbstractWidgetView.extend({
        render: function() {
            WidgetView.__super__.render.call(this);
            this.$el.addClass("price-widget-booking");

            this.model.days = new DayCollection(this.model.get("days"), {
                container: this.container,
                widget: this.model
            });

            return this;
        }
    });

    /**
     * Booking Price Widget
     *
     * @param {Object} options for Widget model. See Widget.defaults()
     * @returns {$|jQuery}
     */
    $.fn.bookingPriceWidget = function(options) {
        var container = this,
            view = new WidgetView({model: new Widget(options)});

        view.model.on('change', function() {
            container.trigger('booking.change', view);
        });

        return this.append(view.render().el);
    };
});
