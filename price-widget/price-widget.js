var PriceWidget = {};

$(function() {
    if (!_.has(window, "moment")) {
        throw new Error("PriceWidget requires moment.js");
    }

    var DAY_LOADING_CLASS = "day-loading",
        renderLOADING = _.getTemplate('day-loading-template'),
        dayPopoverTemplate = $('#day-popover-template').html(),
        renderPopoverContent = _.getTemplate('day-popover-content-template');

    /**
     * Get difference between two dates
     *
     * @param {Object} first
     * @param {Object} second
     * @returns {Number}
     */
    function differenceDays(first, second) {
        var diff = first.clone().diff(second);

        return moment.duration(diff).get("d");
    }

    /**
     * Pages info store pages numbers with states
     *
     * @param {Object} pages {0: "loaded", ...}
     * @constructor
     */
    var PagesInfo = function(pages) {
        this.pages = {};

        /**
         * Set status to given pages
         *
         * @param {Array|Number} page_s
         * @param {String} status
         */
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

        this.getPendingAmount = function() {
            var amount = 0;

            _.each(this.pages, function(status) {
                if (status == DayCollection.PAGE_PENDING) {
                    amount++;
                }
            });

            return amount;
        };

        /**
         * Get indexes of pages needed to load
         *
         * @param {Number} page Index of current page
         * @returns {Array} with MAX_LOADING_PAGES indexes
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

        this.pages = pages || {};
    };

    var Day = Backbone.Model.extend({
        defaults: function() {
            return {
                currency: "$",
                price: 0,
                discount: 0,
                type: "",
                prices: [],

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
                el = view.render().el;

            if (_.has(options, "at")) {
                // Recognizing li.day-loading element and replace by view
                var anchor,
                    $loading;

                if (options.at == 0) {
                    anchor = this.collection.at(0);
                    $loading = anchor.view.$el.prevAll();
                } else {
                    anchor = this.collection.at(options.at - 1);
                    $loading = anchor.view.$el.nextAll();
                }

                var duration = differenceDays(this.get("date"), anchor.get("date")),
                    $replacement = $loading.eq(Math.abs(duration) - 1);

                if ($replacement.hasClass(DAY_LOADING_CLASS)) {
                    $replacement.replaceWith(el);
                }
            } else {
                this.collection.container.append(el);
            }
        },
        isType: function(type) {
            return this.get("type") == type;
        },
        /**
         * Get date representation according to given format
         *
         * @param {String} format Compatible to Moment.js (http://momentjs.com/docs/#/displaying/format/)
         * @returns {String}
         */
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
        template: _.getTemplate('day-template'),
        events: {
            'mouseenter': "mouseEnter",
            'mouseleave': "mouseLeave"
        },
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);

            this.model.view = this;
            this.popover = false;
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
            return !(this.model.isType("poa") || this.model.isType("sold"));
        },
        /**
         * Initialize (if needed) and show day's popover
         */
        showPopover: function() {
            if (!this.popover) {
                var data = _.extend({}, this.model.toJSON(), {
                    minNights: this.getWidget().model.get("minNights")
                });

                this.$el.popover({
                    content: renderPopoverContent(data),
                    placement: "top",
                    container: "body",
                    html: true,
                    template: dayPopoverTemplate
                });

                this.popover = true;
            }

            this.$el.popover('show');
        },
        mouseEnter: function() {
            if (this.popoverAllowed()) {
                this.showPopover();
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
            this.currentlyLoading = false;

            var length = models.length,
                DAYS_PER_PAGE = this.widget.getDaysPerPage();

            if (!this.checkLength(models)) {
                throw new Error("Days amount must be multiple to " + DAYS_PER_PAGE + ". Current is " + length);
            }

            if (length == 0) {
                throw new Error("Widget must be initialized with at least " + DAYS_PER_PAGE + " days");
            }

            // Performing PagesInfo
            var today = moment(),
                firstDate = moment(_.first(models).id, Day.formats.SERVER),
                diff = differenceDays(today, firstDate);

            if (diff > 0) {
                throw new Error("Date of first day is earlier than today");
            }

            var pagesPending = Math.ceil(-diff / DAYS_PER_PAGE),
                config = {},
                loaded = length / DAYS_PER_PAGE;

            _.each(_.range(0, pagesPending), function(x) {
                config[x] = DayCollection.PAGE_PENDING;
            });

            _.each(_.range(pagesPending, pagesPending + loaded), function(x) {
                config[x] = DayCollection.PAGE_LOADED;
            });

            this.pages = new PagesInfo(config);

            // Prepend LOADINGs if first date is not today
            var pendingPagesAmount = this.pages.getPendingAmount(),
                pendingDays = pendingPagesAmount * this.widget.getDaysPerPage();

            if (pendingPagesAmount) {
                this.container.prepend(renderLOADING({
                    days: pendingDays
                }));

                this.widget.day = pendingDays;
                this.widget.page = pendingPagesAmount;

                this.widget.move(0, true);
            }

            // Set min day
            if (pendingDays > 0) {
                this.minDay = pendingDays + diff - 1;
            } else {
                this.minDay = 0;
            }
        },
        /**
         * Validate length of adding days
         *
         * @param {Array} days
         * @returns {boolean}
         */
        checkLength: function(days) {
            return (days.length % this.widget.getDaysPerPage() == 0);
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
        /**
         * Get last day of given page
         *
         * @param {Number} page
         * @returns {Day}
         */
        lastOfPage: function(page) {
            var index = ((page + 1) * this.widget.getDaysPerPage()) - 1,
                $el = this.container.find('li.panel-day').eq(index),
                collectionIndex = index - $el.prevAll("." + DAY_LOADING_CLASS).length;

            return this.at(collectionIndex);
        },
        /**
         * Request to server and handle loaded days
         *
         * @param {Array} pages Indexes of pages
         * @param {Object} after [Moment] Load days directly after this date
         * @param {Number} addFrom Index of a day after which loaded days will be added
         * @returns {*}
         */
        fetchPages: function(pages, after, addFrom) {
            var self = this;

            if (this.currentlyLoading) {
                return;
            }

            after.add(1, 'days');

            return $.ajax({
                url: this.url(),
                data: {
                    start: after.format(Day.formats.SERVER),
                    size: pages.length * this.widget.getDaysPerPage()
                },
                beforeSend: function() {
                    self.pages.set(pages, DayCollection.PAGE_LOADING);
                    self.widget.toggleControls(true);

                    self.currentlyLoading = true;
                }
            }).done(function(data) {
                if (self.addPage(data, addFrom)) {
                    self.pages.set(pages, DayCollection.PAGE_LOADED);
                }
            }).fail(function() {
                //
            }).always(function() {
                self.widget.toggleControls(false);

                self.currentlyLoading = false;
            });
        },
        /**
         * Check if loading is needed, compose loading and run fetchPages()
         *
         * @param {Number} page Number of page
         */
        loadRequiredPages: function(page) {
            if (this.currentlyLoading) {
                return;
            }

            // Detecting pages need to load
            var DAYS_PER_PAGE = this.widget.getDaysPerPage(),
                requiredPages = this.pages.getRequired(page),
                lastLoadedPageIndex,
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

            var distance,
                after,
                addFrom;

            if (lastLoadedPageIndex == undefined) {
                // Loading `pending` days before current
                distance = _.size(requiredPages);
                after = this.first().get("date").clone();
                addFrom = 0;

                after.subtract((DAYS_PER_PAGE * distance) + 1, 'days');

                // Loading must be added when initialized
            } else {
                var lastDayOfPage = this.lastOfPage(lastLoadedPageIndex);

                distance = (_.first(requiredPages) - 1) - lastLoadedPageIndex;
                after = lastDayOfPage.get("date").clone();
                addFrom = this.indexOf(lastDayOfPage) + 1;

                if (distance > 0) {
                    // insert with gap after lastDayOfPage
                    after.add(distance * DAYS_PER_PAGE, 'days');
                }

                if (chunksLOADIND) {
                    var daysLOADING = chunksLOADIND * DAYS_PER_PAGE,
                        containerWidth = parseInt(this.container.css('width'), 10),
                        newContainerWidth = containerWidth + (daysLOADING * WidgetView.DAY_WIDTH);

                    this.container.css('width', newContainerWidth + "px");

                    lastDayOfPage.view.$el.after(renderLOADING({
                        days: daysLOADING
                    }));
                }
            }

            this.fetchPages(requiredPages, after, addFrom);
        }
    }, {
        PAGE_LOADED:  "loaded",  // All days of page has been successfully loaded and present in container
        PAGE_LOADING: "loading", // Same as PAGE_LOADING, but days of page are currently loading
        PAGE_PENDING: "pending"  // .day-loading elements in container instead of real days in the page.
    });

    var Widget = Backbone.Model.extend({
        initialize: function() {
            this.on('page.change', this.pageChanged);
        },
        defaults: function() {
            return {
                minNights: 1,
                url: "",
                days: [],
                DAYS_PER_PAGE: 7,
                movable: true // <false> if movable is not needed, <object> options for $.fn.movable, <true> for default
            };
        },
        pageChanged: function(page) {
            this.days.loadRequiredPages(page);
        }
    });

    var AbstractWidgetView = Backbone.View.extend({
        tagName: 'div',
        template: _.getTemplate('widget-template'),
        events: {
            'click a.widget-action-backward': "backward",
            'click a.widget-action-fast-backward': "fastBackward",
            'click a.widget-action-forward': "forward",
            'click a.widget-action-fast-forward': "fastForward"
        },
        initialize: function(options) {
            var self = this;

            this.day = 0;
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
            var self = this,
                movable = this.model.get("movable");

            this.$el.html(this.template(this.model.toJSON()));

            this.pricesContainer = this.$el.find('ul.prices-container');

            if (movable) {
                if (!$.fn.movable) {
                    throw new Error("PriceWidget requires Movable plugin");
                }

                this.pricesContainer.movable(movable).on('move.moving', function(e) {
                    var left = self.pricesContainer.movable("getLeft"),
                        day = Math.floor(left / -AbstractWidgetView.DAY_WIDTH);

                    self.setDay(day);
                });
            }

            return this;
        },
        getDaysPerPage: function() {
            return this.model.get("DAYS_PER_PAGE");
        },
        toggleControls: function(disable) {
            this.$('a.widget-action').toggleClass("disabled", disable);
        },
        /**
         * Set current page
         *
         * @param {Number} page
         */
        setPage: function(page) {
            var previousPage = this.page;

            this.page = page;

            if (this.page < 0) { // prevent left border cross
                this.page = 0;
            }

            if (previousPage != this.page) {
                this.model.trigger('page.change', this.page);
            }
        },
        /**
         * Set current day. Updates current page if day changed
         *
         * @param {Number} day
         */
        setDay: function(day) {
            var previousDay = this.day;

            this.day = day;

            if (this.day < this.model.days.minDay) { // prevent left border cross
                this.day = this.model.days.minDay;
            }

            if (previousDay != this.day) {
                var page = Math.floor(this.day / this.getDaysPerPage());

                this.setPage(page);
            }
        },
        /**
         * Move container depending on previous day index
         *
         * @param {Number} previousDay
         * @param {Boolean} immediate True if without animation
         */
        move: function(previousDay, immediate) {
            var containerOffset = AbstractWidgetView.DAY_WIDTH * this.day,
                duration = 0;

            if (!immediate) {
                var difference = Math.abs(previousDay - this.day);

                duration = (difference * 15 + 80) * 2;

                if (!PriceWidget.isWide()) {
                    duration *= 1.4;
                }
            }

            this.pricesContainer.animate({
                left: "-" + containerOffset + "px"
            }, duration);
        },
        /**
         * Move prices container <days> from current position
         *
         * @param {Number} days Offset
         */
        scroll: function(days) {
            var previousDay = this.day;

            this.setDay(previousDay + days);
            this.move(previousDay, false);
        },
        backward: function(e) {
            e.preventDefault();
            this.scroll(-1 * this.getDaysPerPage());
        },
        fastBackward: function(e) {
            e.preventDefault();
            this.scroll(-4 * this.getDaysPerPage());
        },
        forward: function(e) {
            e.preventDefault();
            this.scroll(1 * this.getDaysPerPage());
        },
        fastForward: function(e) {
            e.preventDefault();
            this.scroll(4 * this.getDaysPerPage());
        }
    }, {
        DAY_WIDTH: 57,
        BASE_SCROLL_DURATION: 400
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
        isWide: function() {
            if (!_.has(window, "matchMedia")) {
                return false;
            }

            var result = window.matchMedia("screen and (min-width: 768px)");

            return result.matches;
        },
        insertPlugin: function(container, view) {
            var $el = $(view.render().el);

            if (PriceWidget.isWide()) {
                $el.css('opacity', 0);
                container.html($el);
                $el.animate({opacity: 1}, 2000);
            } else {
                container.html($el);
            }

            return container.data("priceWidget", view);
        },
        plugin: {
            initialize: function(options) {
                var view = new WidgetView({
                    model: new Widget(options),
                    container: this
                });

                return PriceWidget.insertPlugin(this, view);
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

    $('div.price-widget-container[data-initialize="widget"]').each(function() {
        var $this = $(this),
            data = $this.data();

        $this.removeAttr("data-days")
            .removeAttr("data-url")
            .removeAttr("data-min-nights")
            .removeClass("price-widget-loading");

        $this.priceWidget({
            minNights: data.minNights || 1,
            url: data.url,
            days: data.days
        });
    });
});
