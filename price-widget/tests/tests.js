var priceWidgetToday,
    priceWidgetPast;

var testIterations = (function() {
    var iteration = 0;

    /**
     * Run code in `iteration`, wait 100 milliseconds after each iteration, run `end` after all
     *
     * @param {{times, interval, iteration, end}} options
     */
    function doIteration(options) {
        options.iteration(iteration);
        iteration++;

        setTimeout(function() {
            if (iteration >= options.times) {
                options.end();
            } else {
                doIteration(options);
            }
        }, options.interval);
    }

    return doIteration;
})();

$(function() {
    var FORMAT_SERVER = PriceWidget.Day.formats.SERVER,
        today = moment(),
        past = moment(),
        $priceWidgetToday = $('#widget-today'),
        $priceWidgetFuture = $('#widget-future'),
        $priceWidgetPast = $('#widget-past');

    $.ajax.set("REQUEST_DELAY", {
        min: 0,
        max: 10
    });

    past.subtract(14, "days");

    var today_SERVER = today.format(FORMAT_SERVER),
        past_SERVER = past.format(FORMAT_SERVER);

    priceWidgetToday = $priceWidgetToday.priceWidget({
        url: "/property/1/prices",
        days: PriceWidgetTest.fixtures(today),
        ANIMATION_RATIO: 0.3
    }).priceWidget("widget");

    priceWidgetPast = $priceWidgetPast.priceWidget({
        url: "/property/1/prices",
        days: PriceWidgetTest.fixtures(past),
        ANIMATION_RATIO: 0.3
    }).priceWidget("widget");

    var DAYS_PER_PAGE = priceWidgetToday.model.get("DAYS_PER_PAGE"),
        PAGES_PER_FAST_FORWARD = 4;

    var priceWidgetTodayTest = new PriceWidgetTest({
        widget: priceWidgetToday,
        FORMAT_SERVER: PriceWidget.Day.formats.SERVER
    });

    var priceWidgetPastTest = new PriceWidgetTest({
        widget: priceWidgetPast,
        FORMAT_SERVER: PriceWidget.Day.formats.SERVER
    });

    QUnit.test("Today - Fast forward", function(assert) {
        var done = assert.async(),
            times = 10,
            days = [
                [today_SERVER, 14]
            ];

        _.times(times, function(i) {
            var day = today.clone();

            day.add(PAGES_PER_FAST_FORWARD * 7 * (i + 1), "days");
            days.push([day.format(FORMAT_SERVER), 21]);
        });

        testIterations({
            times: times,
            interval: 500,
            iteration: function() {
                priceWidgetTodayTest.buttons.fastForward.click();
            },
            end: function() {
                priceWidgetTodayTest.assertDayAndPage(assert, DAYS_PER_PAGE * PAGES_PER_FAST_FORWARD * times, PAGES_PER_FAST_FORWARD * times);
                priceWidgetTodayTest.assertConsistencyBlocks(assert, days);

                priceWidgetTodayTest.assertPages(assert, {
                    0: true, 1: true, 2: false, 3: false,
                    4: true, 5: true, 6: true, 7: false,
                    8: true, 9: true, 10: true, 11: false,
                    12: true, 13: true, 14: true, 15: false,
                    16: true, 17: true, 18: true, 19: false,
                    20: true, 21: true, 22: true, 23: false,
                    24: true, 25: true, 26: true, 27: false,
                    28: true, 29: true, 30: true, 31: false,
                    32: true, 33: true, 34: true, 35: false,
                    36: true, 37: true, 38: true
                });

                done();
            }
        });
    });

    QUnit.test("Past - Forward", function(assert) {
        var done = assert.async(),
            days = [
                [past_SERVER, 35]
            ];

        testIterations({
            times: 1,
            interval: 500,
            iteration: function() {
                priceWidgetPastTest.buttons.forward.click();
            },
            end: function() {
                priceWidgetPastTest.assertDayAndPage(assert, DAYS_PER_PAGE * 1, 1);
                priceWidgetPastTest.assertConsistencyBlocks(assert, days);
                priceWidgetPastTest.assertPages(assert, {
                    0: true, 1: true, 2: true, 3: true, 4: true
                });

                done();
            }
        });
    });
});
