var priceWidgetToday;

$(function() {
    var FORMAT_SERVER = PriceWidget.Day.formats.SERVER,
        today = moment(),
        today_SERVER = today.format(FORMAT_SERVER),
        $priceWidgetToday = $('#widget-today'),
        $priceWidgetFuture = $('#widget-future'),
        $priceWidgetPast = $('#widget-past');

    priceWidgetToday = $priceWidgetToday.priceWidget({
        url: "/property/1/prices",
        days: PriceWidgetTest.fixtures(today)
    }).priceWidget("widget");

    var DAYS_PER_PAGE = priceWidgetToday.model.get("DAYS_PER_PAGE");

    var priceWidgetTodayTest = new PriceWidgetTest({
        widget: priceWidgetToday,
        FORMAT_SERVER: PriceWidget.Day.formats.SERVER
    });

    QUnit.test("Fast forward", function(assert) {
        var done = assert.async();

        priceWidgetTodayTest.buttons.fastForward.click();

        setTimeout(function() {
            priceWidgetTodayTest.buttons.fastForward.click();

            setTimeout(function() {
                priceWidgetTodayTest.buttons.fastForward.click();

                setTimeout(function() {
                    priceWidgetTodayTest.assertDayAndPage(assert, 84, 12);
                    done();
                }, 2100);
            }, 2100);
        }, 2100);
    });
});
