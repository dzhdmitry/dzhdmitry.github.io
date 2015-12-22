var PriceWidget = {};

$(function() {
    var DAYS_PER_PAGE = 7,
        loadingTemplate = _.template($('#day-loading-template').html())();

    var Day = Backbone.Model.extend({
        defaults: function() {
            return {
                id: _.uniqueId(),
                dayOfWeek: "",
                day: "",
                month: "",
                year: "",
                currency: "$",
                price: 0,
                discount: 0,
                type: "",
                checkbox: false,
                isChecked: false,
                isActive: false
            };
        },
        urlRoot: "",
        initialize: function(attributes, modelOptions) {
            var view = new this.collection.view({model: this}),
                container = this.collection.container,
                el = view.render().el;

            if (_.has(modelOptions, "at")) {
                var $replacement = container.children().eq(modelOptions.at);

                if ($replacement.hasClass("day-loading")) {
                    $replacement.replaceWith(el);
                }
            } else {
                container.append(el);
            }
        },
        getDate: function() {
            var month = this.get("month");

            return this.get("day") + "/" + Day.MONTHS[month] + "/" + this.get("year");
        }
    }, {
        MONTHS: {Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12}
    });

    var DayView = Backbone.View.extend({
        tagName: 'li',
        template: _.template($('#day-template').html()),
        events: {
            'mouseenter': "mouseEnter",
            'mouseleave': "mouseLeave"
        },
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);

            this.model.view = this;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.addClass("panel panel-day").attr("data-date", this.model.getDate());

            return this;
        },
        mouseEnter: function(e) {
            //console.log("mouseenter", e, this);
        },
        mouseLeave: function(e) {
            //console.log("mouseleave", e, this);
        }
    });

    var DayCollection = Backbone.Collection.extend({
        view: DayView,
        model: Day,
        urlRoot: "",
        initialize: function(models, collectionOptions) {
            this.container = collectionOptions.container;
            this.widget = collectionOptions.widget;
            this.chunks = {
                0: DayCollection.CHUNK_LOADED
            };
        },
        lastOfChunk: function(n) {
            return ((n + 1) * DayCollection.CHUNK_SIZE) - 1;
        },
        chunkIs: function(n, status) {
            return _.has(this.chunks, n) && (this.chunks[n] == status);
        },
        loadChunk: function(n) {
            var self = this,
                previous = n - 1,
                loadingDays = "",
                loadingCount = this.chunkIs(n, DayCollection.CHUNK_PENDING) ? 0 : DayCollection.CHUNK_SIZE;

            if (this.chunkIs(n, DayCollection.CHUNK_LOADED) || this.chunkIs(n, DayCollection.CHUNK_LOADING)) {
                // Prevent chunk load
                return;
            }

            if (n > 1 && !this.chunkIs(previous, DayCollection.CHUNK_LOADED)) {
                loadingCount = DayCollection.CHUNK_SIZE * 2;
                this.chunks[previous] = DayCollection.CHUNK_PENDING;
            }

            _.times(loadingCount, function() {
                loadingDays += loadingTemplate;
            });

            var $loading = $(loadingDays),
                lastAt = this.lastOfChunk(previous),
                lastOfChunk = this.at(lastAt),
                after;

            if (lastOfChunk) { // Forward
                after = lastOfChunk.getDate();
            } else { // Fast forward
                lastOfChunk = self.last();
                after = "1/2/2015";
            }

            $_ajax({
                url: "getNext14days",
                data: {
                    property: _.uniqueId(),
                    after: after
                },
                beforeSend: function() {
                    self.chunks[n] = DayCollection.CHUNK_LOADING;

                    lastOfChunk.view.$el.after($loading);
                }
            }).done(function(data) {
                self.chunks[n] = DayCollection.CHUNK_LOADED;

                _.each(data, function(item, i) {
                    self.add(item, {
                        at: lastAt + i + 1
                    });
                });
            }).fail(function() {
                //
            }).always(function() {
                //
            });
        }
    }, {
        CHUNK_SIZE: 14,
        CHUNK_LOADED: "loaded",
        CHUNK_LOADING: "loading",
        CHUNK_PENDING: "pending"
    });

    var Widget = Backbone.Model.extend({
        defaults: function() {
            return {
                days: []
            };
        }
    });

    var AbstractWidgetView = Backbone.View.extend({
        tagName: 'div',
        template: _.template($('#widget-template').html()),
        events: {
            'click button.widget-action-backward': "backward",
            'click button.widget-action-fast-backward': "fastBackward",
            'click button.widget-action-forward': "forward",
            'click button.widget-action-fast-forward': "fastForward"
        },
        initialize: function(options) {
            this.page = 0;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            this.container = this.$el.find('ul.prices-container');

            return this;
        },
        scroll: function(direction, steps, callback) {
            if (direction == WidgetView.DIRECTION_LEFT) {
                this.page -= steps;
            } else {
                this.page += steps;
            }

            if (this.page < 0) { // prevent left border cross
                this.page = 0;
            }

            var offset = WidgetView.DAY_WIDTH * DAYS_PER_PAGE * this.page;

            this.container.animate({right: offset + "px"}, 'fast', callback);
        },
        getCurrentChunk: function() {
            var oddPage = (this.page % 2 == 0) ? this.page : this.page - 1;

            return oddPage / 2;
        },
        backward: function() {
            this.scroll(WidgetView.DIRECTION_LEFT, 1);
        },
        fastBackward: function() {
            this.scroll(WidgetView.DIRECTION_LEFT, 4);
        },
        forward: function() {
            var self = this;

            // Go 1 step forward and load next chunk
            this.scroll(WidgetView.DIRECTION_RIGHT, 1, function() {
                self.model.days.loadChunk(self.getCurrentChunk() + 1);
            });
        },
        fastForward: function() {
            var self = this;

            // Go 4 steps forward and load current chunk
            this.scroll(WidgetView.DIRECTION_RIGHT, 4, function() {
                self.model.days.loadChunk(self.getCurrentChunk());
            });
        }
    }, {
        DAY_WIDTH: 57,
        DIRECTION_LEFT: "left",
        DIRECTION_RIGHT: "right"
    });

    var WidgetView = AbstractWidgetView.extend({
        render: function() {
            WidgetView.__super__.render.call(this);

            this.model.days = new DayCollection(this.model.get("days"), {
                container: this.container,
                widget: this.model
            });

            return this;
        }
    });

    PriceWidget = {
        Day: Day,
        DayView: DayView,
        DayCollection: DayCollection,
        Widget: Widget,
        AbstractWidgetView: AbstractWidgetView
    };

    /**
     * Price Widget
     *
     * @param {Object} options for Widget model. See Widget.defaults()
     * @returns {$|jQuery}
     */
    $.fn.priceWidget = function(options) {
        var view = new WidgetView({model: new Widget(options)});

        return this.append(view.render().el);
    };
});
