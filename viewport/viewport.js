/*! Single page application framework - v0.5.0 - 2017-01-03
* https://github.com/dzhdmitry/spa
* Copyright (c) 2017 Dmitry Dzhuleba;
* Licensed MIT
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'backbone'], factory);
    } else {
        root.Viewport = factory(root._, root.Backbone);
    }
}(this, function(_, Backbone) {
    var Viewport = {};

    if (!_) {
        console.error("Underscore is required by Backbone-Viewport");
        return;
    }

    if (!Backbone) {
        console.error("Backbone is required by Backbone-Viewport");
        return;
    }

    Viewport.View = Backbone.View.extend({
        tagName: "div",
        initialize: function() {
            this.listenTo(this.model, 'render', this.render);
            this.listenTo(this.model, 'change:active', this.toggleActive);
        },
        /**
         * Must be overridden.
         * Receives model attributes and return rendered string.
         *
         * @param {Object} data
         * @returns {String}
         */
        template: function(data) {
            return "";
        },
        /**
         * Renders model attributes by .template() and toggles the container by model's `active` attribute.
         *
         * @returns {Viewport.View}
         */
        render: function() {
            var html = this.template(this.model.toJSON());

            this.$el.html(html);
            this.trigger("rendered");

            return this;
        },
        /**
         * Set `display: block` css style to page container if `active=true`, or `display:none` if false.
         * Override it to use different behaviour.
         *
         * @param {Boolean} active
         */
        toggle: function(active) {
            var display = active ? "block" : "none";

            this.$el.css("display", display);
        },
        toggleActive: function() {
            this.toggle(this.model.get("active"));
        }
    });

    Viewport.Model = Backbone.Model.extend({
        idAttribute: "uri",
        defaults: {
            active: false // Indicates visibility of a page. When true, page container is set `display: block` css style, and `display:none` if false
            // All model's attributes are available in `view.template()`
        },
        getFetchOptions: function() {
            return {};
        },
        url: function() {
            return "/" + this.get("uri");
        },
        /**
         * Set `page.active` property to `true` (must cause view rendering).
         * Triggers `shown` event.
         */
        show: function() {
            this.set("active", true);

            if (this.hasChanged("active")) {
                this.trigger("shown");
            }
        },
        /**
         * Set `page.active` property to `false`.
         * Triggers `hidden` event.
         */
        hide: function() {
            this.set("active", false);

            if (this.hasChanged("active")) {
                this.trigger("hidden");
            }
        }
    });

    Viewport.Collection = Backbone.Collection.extend({
        model: Viewport.Model,
        view: Viewport.View,
        /**
         * Create view for given model[s]
         *
         * @param {Viewport.Model|Viewport.Model[]} model
         */
        createView: function(model) {
            var self = this;

            function fn(page) {
                var view = new self.view({model: page});

                self.el.append(view.render().el);
                view.toggleActive();
            }

            if (_.isArray(model)) {
                _.each(model, fn);
            } else {
                fn(model);
            }
        },
        /**
         * Create page model, add to collection and create view if needed
         *
         * @param {Object} attributes
         * @param {Boolean} createView
         * @returns {Viewport.Model}
         */
        addPage: function(attributes, createView) {
            var model = this.add(attributes);

            if (createView) {
                this.createView(model);
            }

            return model;
        },
        /**
         * Merge page with attributes, create view or re-render
         *
         * @param {Object} attributes
         * @param {Boolean} createView
         * @returns {Viewport.Model}
         */
        mergePage: function(attributes, createView) {
            var model = this.add(attributes, {
                merge: true
            });

            if (createView) {
                this.createView(model);
            } else {
                model.trigger("render");
            }

            return model;
        },
        /**
         * Add page with existing view
         *
         * @param {Object} attributes `uri` is mandatory
         * @param {*} $el
         * @returns {Viewport.Model}
         */
        pushPage: function(attributes, $el) {
            var defaults = {
                    active: true
                },
                modelAttributes = _.extend({}, defaults, attributes),
                page = new this.model(modelAttributes),
                view = new this.view({model: page});

            view.setElement($el);
            this.add(page);

            return page;
        },
        /**
         * Open page with given uri and hide others.
         * Find and `show()` page with uri, `hide()` other pages.
         *
         * @param {String} uri
         */
        open: function(uri) {
            this.each(function(page) {
                if (page.get("uri") == uri) {
                    page.show();
                } else {
                    page.hide();
                }
            });
        }
    });

    Viewport.Router = Backbone.Router.extend({
        collection: Viewport.Collection,
        initialize: function(options) {
            var defaults = {
                    el: Backbone.$('body'),
                    start: true,
                    pushState: false,
                    silent: false,
                    root: '/',
                    pages: []
                },
                settings = _.extend({}, defaults, options);

            this.pushState = settings.pushState;
            this.silent = settings.silent;
            this.root = settings.root;
            this.pages = new this.collection();
            this.pages.el = settings.el;

            this.listenTo(this.pages, 'reset', function(collection) {
                collection.each(function(model) {
                    collection.createView(model);
                });
            });

            this.pages.reset(settings.pages);

            if (settings.start) {
                this.start();
            }

            Viewport.Router.__super__.initialize.call(this, options);
        },
        /**
         * Run `Backbone.history.start()` with `pushState` and `root` provided in constructor and overridden by provided directly.
         *
         * @param {Object=} options
         */
        start: function(options) {
            var defaults = {
                    pushState: this.pushState,
                    root: this.root,
                    silent: this.silent
                },
                settings = _.extend({}, defaults, options);

            Backbone.history.start(settings);
        },
        /**
         * Stop watching uri changes (Run `Backbone.history.stop()`).
         */
        stop: function() {
            Backbone.history.stop();
        },
        /**
         * Returns current route depends on router type (pushState or hash)
         *
         * @returns {String}
         */
        getCurrentRoute: function() {
            return (this.pushState) ? Backbone.history.getPath() : Backbone.history.getHash();
        },
        /**
         * Read document uri and activate page with given `attributes` (PlainObject).
         * If page not exists in collection, it will be created with given `attributes`, and added to collection.
         *
         * @param {Object} attributes
         * @param {Object=} options
         */
        go: function(attributes, options) {
            var uri = this.getCurrentRoute(),
                modelAttributes = _.extend({uri: uri}, attributes),
                collection = this.pages;

            var settings = _.extend({}, {
                force: false,
                load: false
            }, options);

            function openPage() {
                collection.open(modelAttributes.uri);
            }

            function fetchPage(model, createView) {
                var defaults = {
                    success: function(data) {
                        collection.mergePage(data, createView);
                        openPage();
                    }
                };

                model.fetch(_.extend(defaults, model.getFetchOptions()));
            }

            if (this.pages.has(modelAttributes.uri)) {
                // Page is already in collection...
                if (settings.force) {
                    // ...but re-rendering is required although
                    if (settings.load) {
                        // and loading is required too
                        var existed = this.pages.get(modelAttributes.uri);

                        fetchPage(existed, false);
                    } else {
                        // merge attributes to existing page
                        this.pages.mergePage(modelAttributes, false);
                        openPage();
                    }
                } else {
                    // ...and just needs to be shown
                    openPage();
                }
            } else {
                // Page is not in collection
                if (settings.load) {
                    // and loading is required
                    var model = this.pages.addPage(modelAttributes, false);

                    fetchPage(model, true);
                } else {
                    // and just needs to merge attributes and to be shown
                    this.pages.addPage(modelAttributes, true);
                    openPage();
                }
            }
        }
    });

    return Viewport;
}));
