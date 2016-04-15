(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['jquery', 'underscore', 'backbone'], factory);
    } else {
        // Browser globals.
        root.SPA = factory(root.$, root._, root.Backbone);
    }
}(this, function($, _, Backbone) {
    var SPA = {};

    SPA.View = Backbone.View.extend({
        tagName: "div",
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
        },
        /**
         * Override this function
         *
         * @param {Object} data
         * @returns {String}
         */
        template: function(data) {
            return "";
        },
        render: function() {
            var html = this.template(this.model.toJSON());

            this.$el.html(html);
            this.toggle(this.model.get("active"));

            return this;
        },
        toggle: function(active) {
            var display = active ? "block" : "none";

            this.$el.css("display", display);
        }
    });

    SPA.Model = Backbone.Model.extend({
        defaults: {
            name: "",     // One of script#template-page-<name>
            active: true, // View is `display:block` if true, `hidden` if false
            title: ""     // Will be set as document title when page is active
            // all page attributes accessible in template
        },
        show: function() {
            this.set("active", true);
            $('title').html(this.get("title"));
        },
        hide: function() {
            this.set("active", false);
        }
    });

    SPA.Collection = Backbone.Collection.extend({
        model: SPA.Model,
        view: SPA.View,
        initialize: function(models, options) {
            var self = this;

            this.on('add', function(model) {
                var view = new self.view({model: model});

                options.container.append(view.render().el);
            });
        },
        /**
         * Open page with given uri and hide others
         *
         * @param uri
         */
        open: function(uri) {
            this.each(function(page) {
                if (page.id == uri) {
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
            var defaults = {
                el: $('body'),
                pushState: false,
                root: '/'
            };

            var settings = _.extend({}, defaults, options);

            this.pushState = settings.pushState;
            this.pages = new this.collection([], {
                container: settings.el
            });

            Backbone.history.start({
                pushState: settings.pushState,
                root: settings.root
            });

            SPA.Router.__super__.initialize.call(this, options);
        },
        /**
         * Go to page with specified name
         *
         * @param {Object} attributes Contains name, title, ...
         */
        go: function(attributes) {
            var uri = (this.pushState) ? Backbone.history.getPath() : Backbone.history.getHash(),
                model = _.extend({id: uri}, attributes);

            this.pages.add(model);
            this.pages.open(uri);
        }
    });

    return SPA;
}));
