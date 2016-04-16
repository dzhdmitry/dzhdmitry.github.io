/*! Single page application framework - v0.1.5 - 2016-04-16
* https://github.com/dzhdmitry/spa
* Copyright (c) 2016 Dmitry Dzhuleba;
* Licensed MIT
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'backbone'], factory);
    } else {
        root.SPA = factory(root._, root.Backbone);
    }
}(this, function(_, Backbone) {
    var SPA = {};

    if (!_) {
        console.error("Underscore is required by SPA");
        return;
    }

    if (!Backbone) {
        console.error("Backbone is required by SPA");
        return;
    }

    SPA.View = Backbone.View.extend({
        tagName: "div",
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
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
         * @returns {SPA.View}
         */
        render: function() {
            var html = this.template(this.model.toJSON());

            this.$el.html(html);
            this.toggle(this.model.get("active"));

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
        }
    });

    SPA.Model = Backbone.Model.extend({
        idAttribute: "uri",
        defaults: {
            name: "",     // Name/type of page. Use it to find a template for page
            active: true, // Indicates visibility of a page. When true, page container is set `display: block` css style, and `display:none` if false
            title: ""     // Will be set to document's title when page is shown
            // All model's attributes are available in `view.template()`
        },
        /**
         * Set `page.active` property to `true` (must cause view rendering) and copy page's title to document.
         * Causes view.render().
         */
        show: function() {
            this.set("active", true);
            Backbone.$('title').html(this.get("title"));
        },
        /**
         * Set `page.active` property to `false`.
         * Causes `view.render()`.
         */
        hide: function() {
            this.set("active", false);
        }
    });

    SPA.Collection = Backbone.Collection.extend({
        model: SPA.Model,
        view: SPA.View,
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

    SPA.Router = Backbone.Router.extend({
        collection: SPA.Collection,
        initialize: function(options) {
            var self = this,
                defaults = {
                    el: Backbone.$('body'),
                    start: true,
                    pushState: false,
                    root: '/'
                },
                settings = _.extend({}, defaults, options);

            this.pushState = settings.pushState;
            this.root = settings.root;
            this.pages = new this.collection();

            this.listenTo(this.pages, 'add', function(model) {
                var view = new self.pages.view({model: model});

                settings.el.append(view.render().el);
            });

            if (settings.start) {
                Backbone.history.start({
                    pushState: settings.pushState,
                    root: settings.root
                });
            }

            SPA.Router.__super__.initialize.call(this, options);
        },
        /**
         * Run `Backbone.history.start()` with options `pushState` and `root` provided in constructor
         */
        start: function() {
            Backbone.history.start({
                pushState: this.pushState,
                root: this.root
            });
        },
        /**
         * Read document uri and activate page with given `attributes` (PlainObject).
         * If page not exists in collection, it will be created with given `attributes`, and added to collection.
         *
         * @param {Object} attributes Contains name, title, ...
         */
        go: function(attributes) {
            var uri = (this.pushState) ? Backbone.history.getPath() : Backbone.history.getHash(),
                model = _.extend({uri: uri}, attributes);

            this.pages.add(model);
            this.pages.open(model.uri);
        }
    });

    return SPA;
}));
