var PriceWidget = {};

$(function() {
    if (!_.has(window, "moment")) {
        throw new Error("PriceWidget requires moment.js");
    }

    var loadingTemplate = _.template($('#day-loading-template').html())(),
        dayPopoverTemplate = $('#day-popover-template').html(),
        dayPopoverContentTemplate = _.template($('#day-popover-content-template').html());

    var Day = Backbone.Model.extend({
        defaults: function() {
            return {
                currency: "$",
                price: 0,
                discount: 0,
                type: "",
                prices: [],
                checkbox: false,
                isChecked: false,
                isActive: false,

                // {Moment} Composed in initialize
                date: null,

                // Used in templates
                date_SERVER: "",
                date_LIST: "",
                date_POPOVER: ""
            };
        },
        initialize: function(attributes, options) {
            var self = this;

            _.each(Day.formats, function(format, name) {
                self.set("date_" + name, self.getDate(format));
            });

            this.set("date", moment(this.id, Day.formats.SERVER));

            var view = new this.collection.view({model: this}),
                container = this.collection.container,
                el = view.render().el;

            if (_.has(options, "at")) {
                var $replacement = container.children().eq(options.at);

                if ($replacement.hasClass("day-loading")) {
                    $replacement.replaceWith(el);
                }
            } else {
                container.append(el);
            }
        },
        getDate: function(format) {
            format = format || Day.formats.SERVER;

            return moment(this.id, Day.formats.SERVER).format(format);
        }
    }, {
        formats: {
            SERVER:  "MM/DD/YYYY",    // "m/d/Y" = 01/20/2015
            LIST:    "ddd<br>DD MMM", // "D d M" = Mon 20 Jan
            POPOVER: "DD MMM YYYY"    // "d M Y" = 20 Jan 2015
        }
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

            var data = _.extend({}, this.model.toJSON(), {
                minNights: this.getWidget().get("minNights")
            });

            this.$el.popover({
                content: dayPopoverContentTemplate(data),
                placement: "top",
                container: "body",
                html: true,
                template: dayPopoverTemplate
            });
        },
        getWidget: function() {
            return this.model.collection.widget;
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.addClass("panel panel-day");

            return this;
        },
        popoverAllowed: function() {
            var type = this.model.get("type");

            return !(type == "poa" || type == "sold");
        },
        mouseEnter: function() {
            if (this.popoverAllowed()) {
                this.$el.popover('show');
            }

            this.getWidget().trigger('day.mouseEnter', this.model);
        },
        mouseLeave: function() {
            this.$el.popover('hide');
            this.getWidget().trigger('day.mouseLeave', this.model);
        }
    });

    var DayCollection = Backbone.Collection.extend({
        view: DayView,
        model: Day,
        url: function() {
            return this.widget.get("url");
        },
        initialize: function(models, options) {
            this.container = options.container;
            this.widget = options.widget;
            this.chunks = {
                0: DayCollection.CHUNK_LOADED
            };
        },
        /**
         * Get index of last element in given chunk
         *
         * @param {Number} n
         * @returns {Number}
         */
        lastOfChunk: function(n) {
            return ((n + 1) * DayCollection.CHUNK_SIZE) - 1;
        },
        chunkIs: function(n, status) {
            return _.has(this.chunks, n) && (this.chunks[n] == status);
        },
        setChunk: function(n, status) {
            this.chunks[n] = status;
        },
        /**
         * Request to server and handle loaded days
         *
         * @param {Number} chunk Number of chunk
         * @param {Object} after [Moment] Load days directly after this date
         * @param {Number} addFrom Index of an element after which loaded days will be placed
         * @returns {*}
         */
        fetchChunk: function(chunk, after, addFrom) {
            var self = this;

            return $_ajax({
                url: this.url(),
                data: {
                    after: after.format(Day.formats.SERVER)
                },
                beforeSend: function() {
                    self.setChunk(chunk, DayCollection.CHUNK_LOADING);
                }
            }).done(function(data) {
                self.setChunk(chunk, DayCollection.CHUNK_LOADED);

                _.each(data, function(item, i) {
                    self.add(item, {
                        at: addFrom + i
                    });
                });
            }).fail(function() {
                //
            }).always(function() {
                //
            });
        },
        /**
         * Check if loading is needed, compose loading and run fetchChunk()
         *
         * @param {Number} n Number of chunk
         * @returns {*}
         */
        loadChunk: function(n) {
            if (n < 1) {
                return;
            }

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

                this.setChunk(previous, DayCollection.CHUNK_PENDING);
            }

            _.times(loadingCount, function() {
                loadingDays += loadingTemplate;
            });

            var lastOfChunkIndex = this.lastOfChunk(previous),
                lastOfChunk = this.at(lastOfChunkIndex),
                after;

            if (lastOfChunk) { // Forward
                after = lastOfChunk.get("date").clone();
            } else { // Fast forward
                lastOfChunk = self.last();
                after = lastOfChunk.get("date").clone().add(14, 'days');
            }

            lastOfChunk.view.$el.after(loadingDays);

            return this.fetchChunk(n, after, lastOfChunkIndex + 1);
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
                minNights: 1,
                url: "",
                days: []
            };
        }
    });

    var AbstractWidgetView = Backbone.View.extend({
        tagName: 'div',
        template: _.template($('#widget-template').html()),
        events: {
            'click a.widget-action-backward': "backward",
            'click a.widget-action-fast-backward': "fastBackward",
            'click a.widget-action-forward': "forward",
            'click a.widget-action-fast-forward': "fastForward"
        },
        initialize: function(options) {
            var self = this;

            this.page = 0;
            this.container = options.container;

            this.listenTo(this.model, 'day.mouseEnter', function(day) {
                self.container.trigger('price.day.mouseenter', day);
            });

            this.listenTo(this.model, 'day.mouseLeave', function(day) {
                self.container.trigger('price.day.mouseleave', day);
            });
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            this.pricesContainer = this.$el.find('ul.prices-container');

            return this;
        },
        getCurrentChunk: function() {
            var oddPage = (this.page % 2 == 0) ? this.page : this.page - 1;

            return oddPage / 2;
        },
        scroll: function(e, steps, chunkOffset) {
            e.preventDefault();

            this.page += steps;

            if (this.page < 0) { // prevent left border cross
                this.page = 0;
            }

            var self = this,
                containerOffset = WidgetView.DAY_WIDTH * WidgetView.DAYS_PER_PAGE * this.page;

            chunkOffset = chunkOffset || 0;

            this.pricesContainer.animate({
                right: containerOffset + "px"
            }, 'fast', function() {
                self.model.days.loadChunk(self.getCurrentChunk() + chunkOffset);
            });
        },
        backward: function(e) {
            this.scroll(e, -1);
        },
        fastBackward: function(e) {
            this.scroll(e, -4, 1);
        },
        forward: function(e) {
            this.scroll(e, 1, 1);
        },
        fastForward: function(e) {
            this.scroll(e, 4);
        }
    }, {
        DAYS_PER_PAGE: 7,
        DAY_WIDTH: 57
    });

    var WidgetView = AbstractWidgetView.extend({
        render: function() {
            WidgetView.__super__.render.call(this);

            this.model.days = new DayCollection(this.model.get("days"), {
                container: this.pricesContainer,
                widget: this.model,
                url: this.model.get("url")
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
     * Events:
     *   `price.day.mouseenter` (event, day) Triggers on day mouseenter
     *   `price.day.mouseleave` (event, day) Triggers on day mouseleave
     *
     * @param {Object} options for Widget model. See Widget.defaults()
     * @returns {$|jQuery}
     */
    $.fn.priceWidget = function(options) {
        var view = new WidgetView({
            model: new Widget(options),
            container: this
        });

        return this.append(view.render().el);
    };
});
