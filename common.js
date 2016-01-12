$(function() {
    var templates = {};

    _.mixin({
        /**
         * Create template function
         *
         * @param {String} id HTML attribute of template container
         * @returns {Function}
         */
        getTemplate: function(id) {
            if (!_.has(templates, id)) {
                var $template = $('#' + id);

                if ($template.length === 1) {
                    templates[id] = _.template($template.html());
                } else {
                    return null;
                }
            }

            return templates[id];
        },
        /**
         * Render template
         *
         * @param {String} id HTML attribute of template container
         * @param {Object} data
         * @returns {String}
         */
        render: function(id, data) {
            var template = _.getTemplate(id);

            if (template) {
                return template(data);
            } else {
                return null;
            }
        },
        /**
         * Extend all properties in first object by others and return new object
         * Will not change source objects
         *
         * @returns {Object}
         */
        options: function() {
            var options = {},
                optionsArray = _.toArray(arguments);

            optionsArray.unshift(options);

            return _.extend.apply(null, optionsArray);
        }
    });
});
