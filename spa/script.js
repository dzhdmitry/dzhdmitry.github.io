$(function() {
    var app = {};

    app.View = SPA.View.extend({
        className: "viewport-page",
        template: function(data) {
            var template = $('#template-page-' + this.model.get("name")),
                templateFn = _.template(template.html());

            return templateFn(data);
        }
    });

    app.Collection = SPA.Collection.extend({
        view: app.View
    });

    app.Router = SPA.Router.extend({
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
                title: 'Home &ndash; SPA Example'
            });
        },
        static: function() {
            this.go({
                name: "static",
                title: 'Static &ndash; SPA Example'
            });
        },
        dynamic: function() {
            this.go({
                name: "dynamic",
                title: 'Dynamic &ndash; SPA Example'
            }, {
                force: true
            });
        },
        product: function(name) {
            this.go({
                name: "product",
                title: name + ' &ndash; SPA Example',
                productName: name
            });
        }
    });

    var router = new app.Router({
        el: $('#viewport')
    });
});
