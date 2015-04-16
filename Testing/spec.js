describe('Basic Queue Functionality:', function() {
  
var name = 'Edvard';
var location = 'Red';
var student = 1;
var ta = 0;

 beforeEach(function() {
    browser.get('http://localhost:8080/#/list');
    browser.manage().window().maximize();
    browser.waitForAngular();
  });



 function userLogIn(userName, userType){
  element(by.css('div.col-md-1.text-right.black.clickable.zero-padding')).click();
  element(by.model('name')).sendKeys(userName);
  element.all(by.model('type')).get(userType).click();
  element(by.css('input.btn.btn-default')).click();
 };

function userJoinQueue(joinCourse){
  $('body > div > div.ng-scope > div > div > section > div:nth-child('+ (joinCourse + 1) +')').click();
  $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(1) > div > input').sendKeys(location);
  $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(2)').click();
};

 afterEach(function(){
    userLogIn('delete', ta);
    $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(8)').click();

 });

it('he TA class is able to, by interaction, Purge the queue of all Users', function(){
  userLogIn(name, student);
  userJoinQueue(1);
  browser.get('http://localhost:8080/#/list');
  browser.manage().window().maximize();
  browser.waitForAngular();
  userLogIn('TA', ta);
  $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
  $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(8)').click();
  //expect($('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody').isDisplayed().toBeTruthy());
});

it('a User should be able to log on', function() {
    userLogIn(name, student);
    $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
   // expect(element(by.model('name').getText()).toEqual('Edvard Mickos'));
  });

it('a User should be able to choose a course and join a queue.', function() {
    userLogIn(name, student);
    userJoinQueue(1);
    expect($('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody').getText()).toMatch('^1 Edvard Red.*');
  });

it('a User should be able to leave a joined queue.', function() {
    userLogIn(name, student);
    userJoinQueue(1);
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(3)').click();
    expect($('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody').getText()).toEqual('');
    
  });



it('The Student class will have the possibility the change their own data in the form of location commment and personal comment.', function() {
    userLogIn(name, student);
    $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(1) > div > input').sendKeys(location);
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(2) > div > input').sendKeys('comment1');
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(2)').click();
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(1) > div > input').clear();
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(2) > div > input').clear();
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(1) > div > input').sendKeys('yellow');
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(2) > div > input').sendKeys('comment2');
    $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(4)').click();
    expect($('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody').getText()).toMatch('^1 Edvard yellow comment2.*');
  });

it('The TA class is able to, by interaction, ‘Kick’ a User from the Queue', function(){
  userLogIn(name, student);
  $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
  $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > form > div:nth-child(1) > div > input').sendKeys(location);
  $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(2)').click();
  browser.get('http://localhost:8080/#/list');
  browser.manage().window().maximize();
  browser.waitForAngular();
  userLogIn('TA', ta);
  $('body > div > div.ng-scope > div > div > section > div:nth-child(2)').click();
  browser.actions().doubleClick($('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody')).perform();
  $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody > tr > td:nth-child(6) > div > span:nth-child(1) > button').click();
  expect($('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-9.pull-right > table > tbody').getText()).toEqual('');
  });

it('TA is able to use the interaction ‘Lock’ or ‘Unlock’ with a queue', function(){  
 userLogIn(name, student);
 userJoinQueue(1);
 browser.get('http://localhost:8080/#/list');
 browser.manage().window().maximize();
 browser.waitForAngular();
 userLogIn('TA', ta);
 $('body > div > div.ng-scope > div > div.row.col-md-12 > div.col-md-2.pin-center.black > div:nth-child(9)').click();
 expect($('body > div > div.ng-scope > div > div > section > div:nth-child(8)').not.isEnabled());
});

});