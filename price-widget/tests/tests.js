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

    var priceWidgetTodayTest = new PriceWidgetTest({
        widget: priceWidgetToday,
        FORMAT_SERVER: PriceWidget.Day.formats.SERVER
    });

    var DAYS_PER_PAGE = priceWidgetToday.model.get("DAYS_PER_PAGE");

    // Tests ->
    describe("PriceWidget from today date", function() {
        it("has been initialized ok", function() {
            priceWidgetTodayTest.expectDayAndPage(0, 0);
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 2, today_SERVER);
        });
    });

    describe("PriceWidget async", function() {
        beforeEach(function() {
            jasmine.clock().install();
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it("goes forward", function() {
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 2, today_SERVER);

            priceWidgetTodayTest.buttons.forward.click();
            jasmine.clock().tick(2000);

            priceWidgetTodayTest.expectDayAndPage(7, 1);
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 5, today_SERVER);
            priceWidgetTodayTest.expectCurrentDay("01/29/2016");
        });

        it("goes backward", function() {
            priceWidgetTodayTest.expectDayAndPage(7, 1);

            priceWidgetTodayTest.buttons.backward.click();
            jasmine.clock().tick(2000);

            priceWidgetTodayTest.expectDayAndPage(0, 0);
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 5, today_SERVER);
            priceWidgetTodayTest.expectCurrentDay(today_SERVER);
        });

        it("goes fast forward", function() {
            priceWidgetTodayTest.expectDayAndPage(0, 0);

            priceWidgetTodayTest.buttons.fastForward.click();
            jasmine.clock().tick(2000);

            priceWidgetTodayTest.expectDayAndPage(28, 4);
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 8, today_SERVER);
            priceWidgetTodayTest.expectCurrentDay("02/19/2016");
        });

        it("goes fast forward again", function() {
            priceWidgetTodayTest.expectDayAndPage(28, 4);

            priceWidgetTodayTest.buttons.fastForward.click();
            jasmine.clock().tick(2000);

            priceWidgetTodayTest.expectDayAndPage(56, 8);
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 11, today_SERVER);
            priceWidgetTodayTest.expectCurrentDay("03/18/2016");
        });

        it("goes fast forward again 2", function() {
            priceWidgetTodayTest.expectDayAndPage(56, 8);

            priceWidgetTodayTest.buttons.fastForward.click();
            jasmine.clock().tick(2000);

            priceWidgetTodayTest.expectDayAndPage(84, 12);
            priceWidgetTodayTest.expectDaysAmount(DAYS_PER_PAGE * 14);
            priceWidgetTodayTest.expectConsistencyBlocks([today_SERVER, DAYS_PER_PAGE * 11], ["04/15/2016", DAYS_PER_PAGE * 3]);
        });

        it("goes backward and load pending week", function() {
            priceWidgetTodayTest.expectDayAndPage(84, 12);

            priceWidgetTodayTest.buttons.backward.click();
            jasmine.clock().tick(2000);

            priceWidgetTodayTest.expectDayAndPage(77, 11);
            priceWidgetTodayTest.expectConsistency(DAYS_PER_PAGE * 15, today_SERVER);
        });
    });
});
