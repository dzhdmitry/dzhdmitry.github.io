$(function() {
    var app = {};

    app.View = Viewport.View.extend({
        className: "viewport-page",
        template: function(data) {
            var template = $('#template-page-' + this.model.get("name")),
                templateFn = _.template(template.html());

            return templateFn(data);
        }
    });

    app.Collection = Viewport.Collection.extend({
        view: app.View
    });

    app.Router = Viewport.Router.extend({
        collection: app.Collection,
        routes: {
            '': 'home',
            '!/': 'home',
            '!/static': 'static',
            '!/dynamic': 'dynamic',
            '!/product/:name': 'product'
        },
        home: function() {
            this.go({
                uri: "/",
                name: "home",
                title: 'Home &ndash; Viewport Example'
            });
        },
        static: function() {
            this.go({
                name: "static",
                title: 'Static &ndash; Viewport Example'
            });
        },
        dynamic: function() {
            this.go({
                name: "dynamic",
                title: 'Dynamic &ndash; Viewport Example'
            }, {
                force: true
            });
        },
        product: function(name) {
            this.go({
                name: "product",
                title: name + ' &ndash; Viewport Example',
                productName: name
            });
        }
    });

    var router = new app.Router({
        el: $('#viewport')
    });
});
