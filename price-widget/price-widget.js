var PriceWidget = {};

$(function() {
    if (!_.has(window, "moment")) {
        throw new Error("PriceWidget requires moment.js");
    }

    var loadingTemplate = _.template($('#day-loading-template').html()),
        dayPopoverTemplate = $('#day-popover-template').html(),
        dayPopoverContentTemplate = _.template($('#day-popover-content-template').html());

    var PagesInfo = function(pages) {
        this.pages = {};

        this.set = function(page_s, status) {
            if (_.isArray(page_s)) {
                _.each(page_s, function(page) {
                    this.pages[page] = status;
                }, this);
            } else {
                this.pages[page_s] = status;
            }
        };

        this.is = function(page, status) {
            return _.has(this.pages, page) && (this.pages[page] == status);
        };

        this.isLoading = function(page) {
            return this.is(page, DayCollection.PAGE_LOADING);
        };

        this.isLoaded = function(page) {
            return this.is(page, DayCollection.PAGE_LOADED);
        };

        this.isPending = function(page) {
            return this.is(page, DayCollection.PAGE_PENDING);
        };

        /**
         * Get indexes of pages needed to load
         *
         * @param {Number} page index of current page
         * @returns {Array} with maximum 2 indexes
         */
        this.getRequired = function(page) {
            var MAX_LOADING_PAGES = 3,
                MAX_ITERATIONS = (_.size(this.pages) / 2) + MAX_LOADING_PAGES,
                MAX_DISTANCE = 4,
                iteration = 0,
                iterationPage = page,
                indexes = [];

            while (indexes.length != MAX_LOADING_PAGES) {
                if (iteration++ >= MAX_ITERATIONS || iterationPage < 0) {
                    break;
                }

                if (Math.abs(iterationPage - page) >= MAX_DISTANCE && indexes.length == 0) {
                    break;
                }

                var prev = iterationPage - 1,
                    next = iterationPage + 1;

                if (!this.isLoaded(iterationPage) && !_.contains(indexes, iterationPage)) {
                    var allowed = false;

                    if (indexes.length == 0) {
                        allowed = true;
                    } else {
                        if (iterationPage > _.last(indexes)) {
                            allowed = (iterationPage - _.last(indexes) == 1);
                        } else if (iterationPage < _.first(indexes)) {
                            allowed = (_.first(indexes) - iterationPage == 1);
                        }
                    }

                    if (allowed) {
                        indexes.push(iterationPage);
                        indexes.sort(function(a, b) {
                            return a - b;
                        });
                    }
                }

                if (!this.isLoaded(next)) {
                    iterationPage = next;
                } else {
                    if (prev >= 0 && !this.isLoaded(prev)) {
                        iterationPage = prev;
                    } else {
                        iterationPage = next + 1;
                    }
                }
            }

            return indexes;
        };

        this.set(_.range(pages), DayCollection.PAGE_LOADED);
    };

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
                minNights: this.getWidget().model.get("minNights")
            });

            this.$el.popover({
                content: dayPopoverContentTemplate(data),
                placement: "top",
                container: "body",
                html: true,
                template: dayPopoverTemplate
            });
        },
        /**
         * Get instance of Widget containing this day
         *
         * @returns {Widget}
         */
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

            this.getWidget().trigger('day.mouseenter', this);
        },
        mouseLeave: function() {
            this.$el.popover('hide');
            this.getWidget().trigger('day.mouseleave', this);
        }
    });

    var DayCollection = Backbone.Collection.extend({
        view: DayView,
        model: Day,
        url: function() {
            return this.widget.model.get("url");
        },
        initialize: function(models, options) {
            this.widget = options.widget;
            this.container = this.widget.pricesContainer;

            var length = models.length,
                DAYS_PER_PAGE = this.widget.getDaysPerPage();

            if (!this.checkLength(models)) {
                throw new Error("Days amount must be multiple to " + DAYS_PER_PAGE + ". Current is " + length);
            }

            if (length == 0) {
                throw new Error("Widget must be initialized with at least " + DAYS_PER_PAGE + " days ");
            }

            this.pages = new PagesInfo(length / DAYS_PER_PAGE);
        },
        checkLength: function(models) {
            return (models.length % this.widget.getDaysPerPage() == 0);
        },
        /**
         * Insert loaded days into collection
         *
         * @param {Array} days
         * @param {Number} at
         * @returns {Boolean} Adding was successful
         */
        addPage: function(days, at) {
            if (!this.checkLength(days)) {
                return false;
            }

            _.each(days, function(day, i) {
                this.add(day, {
                    at: at + i
                });
            }, this);

            return true;
        },
        lastDayOfPage: function(page) {
            return ((page + 1) * this.widget.getDaysPerPage()) - 1;
        },
        /**
         * Get day which $el is placed at position
         *
         * @param {Number} index $el position
         * @returns {Day}
         */
        atContainer: function(index) {
            var collectionIndex = 0;

            this.container.find('li.panel-day').each(function(i, panel) {
                if (i == index) {
                    return false;
                } else {
                    if (!$(panel).hasClass('day-loading')) {
                        collectionIndex++;
                    }
                }
            });

            return this.at(collectionIndex);
        },
        /**
         * Request to server and handle loaded days
         *
         * @param {Array} pages Indexes of pages
         * @param {Object} after [Moment] Load days directly after this date
         * @param {Number} addFrom Index of an element after which loaded days will be placed
         * @returns {*}
         */
        fetchPages: function(pages, after, addFrom) {
            var self = this;

            after.add(1, 'days');

            return $_ajax({
                url: this.url(),
                data: {
                    start: after.format(Day.formats.SERVER),
                    size: pages.length * this.widget.getDaysPerPage()
                },
                beforeSend: function() {
                    self.pages.set(pages, DayCollection.PAGE_LOADING);
                    self.widget.toggleControls(true);
                }
            }).done(function(data) {
                if (self.addPage(data, addFrom)) {
                    self.pages.set(pages, DayCollection.PAGE_LOADED);
                }
            }).fail(function() {
                //
            }).always(function() {
                self.widget.toggleControls(false);
            });
        },
        /**
         * Check if loading is needed, compose loading and run fetchPages()
         *
         * @param {Number} page Number of page
         * @returns {*}
         */
        loadPage: function(page) {
            // Detecting pages need to load
            var DAYS_PER_PAGE = this.widget.getDaysPerPage(),
                requiredPages = this.pages.getRequired(page),
                lastLoadedPageIndex = 0,
                chunksLOADIND = 0;

            // Prevent loading if not needed
            if (requiredPages.length == 0) {
                return;
            }

            // From loading pages until last loaded chunk [right to left]:
            for (var x = _.last(requiredPages); x >= 0; x--) {
                if (this.pages.isLoaded(x)) {
                    lastLoadedPageIndex = x;

                    break;
                }

                // Set all pages PENDING, allocate LOADING
                if (!this.pages.isPending(x)) {
                    this.pages.set(x, DayCollection.PAGE_PENDING);

                    chunksLOADIND++;
                }
            }

            var distance = (_.first(requiredPages) - 1) - lastLoadedPageIndex,
                lastDayOfPageIndex = this.lastDayOfPage(lastLoadedPageIndex),
                lastDayOfPage = this.atContainer(lastDayOfPageIndex),
                after = lastDayOfPage.get("date").clone();

            if (distance > 0) {
                // insert with gap after lastDayOfPage
                after.add(distance * DAYS_PER_PAGE, 'days');

                lastDayOfPageIndex += distance * DAYS_PER_PAGE;
            }

            if (chunksLOADIND) {
                lastDayOfPage.view.$el.after(loadingTemplate({length: chunksLOADIND * DAYS_PER_PAGE}));
            }

            this.fetchPages(requiredPages, after, lastDayOfPageIndex + 1);
        }
    }, {
        PAGE_LOADED: "loaded",
        PAGE_LOADING: "loading",
        PAGE_PENDING: "pending"
    });

    var Widget = Backbone.Model.extend({
        defaults: function() {
            return {
                minNights: 1,
                url: "",
                days: [],
                DAYS_PER_PAGE: 7
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

            this.on('day.mouseenter', function(dayView) {
                self.container.trigger('price.day.mouseenter', dayView);
            });

            this.on('day.mouseleave', function(dayView) {
                self.container.trigger('price.day.mouseleave', dayView);
            });
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            this.pricesContainer = this.$el.find('ul.prices-container');

            return this;
        },
        getDaysPerPage: function() {
            return this.model.get("DAYS_PER_PAGE");
        },
        toggleControls: function(disable) {
            this.$('a.widget-action').toggleClass("disabled", disable);
        },
        /**
         * Move prices container <steps> from current position
         *
         * @param {Event} e
         * @param {Number} steps Offset
         */
        scroll: function(e, steps) {
            e.preventDefault();

            this.page += steps;

            if (this.page < 0) { // prevent left border cross
                this.page = 0;
            }

            var containerOffset = WidgetView.DAY_WIDTH * this.getDaysPerPage() * this.page;

            this.model.days.loadPage(this.page);

            this.pricesContainer.animate({
                right: containerOffset + "px"
            }, 'fast');
        },
        backward: function(e) {
            this.scroll(e, -1);
        },
        fastBackward: function(e) {
            this.scroll(e, -4);
        },
        forward: function(e) {
            this.scroll(e, 1);
        },
        fastForward: function(e) {
            this.scroll(e, 4);
        }
    }, {
        DAY_WIDTH: 57
    });

    var WidgetView = AbstractWidgetView.extend({
        render: function() {
            WidgetView.__super__.render.call(this);

            this.model.days = new DayCollection(this.model.get("days"), {
                widget: this
            });

            return this;
        }
    });

    PriceWidget = {
        Day: Day,
        DayView: DayView,
        DayCollection: DayCollection,
        Widget: Widget,
        AbstractWidgetView: AbstractWidgetView,
        plugin: {
            initialize: function(options) {
                var view = new WidgetView({
                    model: new Widget(options),
                    container: this
                });

                this.html(view.render().el).data("priceWidget", view);

                return this;
            },
            widget: function() {
                return this.data("priceWidget");
            },
            days: function() {
                return this.data("priceWidget").model.days;
            }
        }
    };

    /**
     * Price Widget
     *
     * Methods:
     *   `widget` $(el).priceWidget("widget") returns current widget
     *
     * Events:
     *   `price.day.mouseenter` (event, dayView) Triggers on day mouseenter
     *   `price.day.mouseleave` (event, dayView) Triggers on day mouseleave
     *
     * @param {Object|String} method Plugin method or options for Widget model. See Widget.defaults()
     * @returns {$|jQuery}
     */
    $.fn.priceWidget = function(method) {
        var parameters = _.toArray(arguments);

        if (_.has(PriceWidget.plugin, method)) {
            return PriceWidget.plugin[method].apply(this, parameters.slice(1));
        } else if (_.isObject(method)) {
            return PriceWidget.plugin.initialize.apply(this, parameters);
        } else {
            $.error("Invalid options for $.fn.priceWidget");
        }
    };
});
