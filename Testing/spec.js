describe('Logging on', function() {
  

 beforeEach(function() {
    browser.get('http://localhost:8080/#/list');
    browser.manage().window().maximize();
    browser.waitForAngular();
  });

it('a User should be able to log on', function() {
    element(by.css('div.col-md-1.text-right.black.clickable.zero-padding')).click();
    element(by.model('name')).sendKeys('Edvard Mickos');
    element.all(by.model('type')).get(1).click();
    element(by.css('input.btn.btn-default')).click();
    $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
   // expect(element(by.model('name').getText()).toEqual('Edvard Mickos'));
  });
});


