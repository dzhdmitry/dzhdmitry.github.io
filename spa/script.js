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
            '!/discovery': 'discovery',
            '!/introduction': 'introduction',
            '!/product/:name': 'product'
        },
        home: function() {
            this.go({
                name: "home",
                title: 'Home &ndash; SPA Example'
            });
        },
        discovery: function() {
            this.go({
                name: "discovery",
                title: 'Discovery &ndash; SPA Example'
            });
        },
        introduction: function() {
            this.go({
                name: "introduction",
                title: 'Introduction &ndash; SPA Example'
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
        el: $('#viewport')/*,
        pushState: true,
        root: '/spa/'*/
    });

    /*$(document).on('click', 'a.spa-link', function(e) {
        if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();

            var $target = $(this),
                url = $target.attr("href").replace(/^\//,'').replace('\#\!\/','');

            router.navigate(url, {
                trigger: true
            });

            setTimeout(function() {
                $target.blur();
            }, 100);

            return false;
        }
    });*/
});
