describe('Basic Queue Functionality:', function() {
var name = 'Edvard';
var location = 'Red';
var student = 'student';
var ta = 'Admin';

 beforeEach(function() {
    browser.get('http://localhost:8080/#/list');
    browser.manage().window().maximize();
    browser.waitForAngular();
    adminLogIn('delete');
    element(by.id('listdbasBtn')).click();
    closeMOTD();
    element(by.id('coursePurgeQueueBtn')).click();
  });



 function userLogIn(userName){
  element(by.id('indexLogInBtn')).isDisplayed().then(function(isVisible) {
      if (isVisible){  
        element(by.id('indexLogInBtn')).click(); 
      } else {  
        element(by.id('indexLogOutBtn')).click();  
      }
    });
  element(by.id('loginInputField')).sendKeys(userName);
  element(by.id('loginRadioUser')).click();
  element(by.id('loginSubmit')).click();
 };

function adminLogIn(userName){
  element(by.id('indexLogInBtn')).isDisplayed().then(function(isVisible) {
      if (isVisible){  
        element(by.id('indexLogInBtn')).click(); 
      } else {  
        element(by.id('indexLogOutBtn')).click();  
      }
    });
  element(by.id('loginInputField')).sendKeys(userName);
  element(by.id('loginRadioAdmin')).click();
  element(by.id('loginSubmit')).click();
 };


function closeMOTD(){
  // browser.sleep(250);
  browser.switchTo().alert().then(
      function(alert) {  return alert.dismiss(); },
      function(err) { }
      );
};

function userJoinQueue(joinCourse){
  element(by.id('list'+joinCourse+'Btn')).click();
  closeMOTD();
  element(by.id('courseLocationInputField')).sendKeys(location);
  element(by.id('courseJoinQueueBtn')).click();
};


 afterEach(function(){
 });

it('he TA class is able to, by interaction, Purge the queue of all Users', function(){
  userLogIn(name);
  userJoinQueue('dbas');
  browser.get('http://localhost:8080/#/list');
  browser.manage().window().maximize();
  browser.waitForAngular();
  adminLogIn('TA');
  element(by.id('listdbasBtn')).click();
  closeMOTD();
  element(by.id('coursePurgeQueueBtn')).click();
  expect(element(by.id('courseEdvardBtn')).isPresent()).toBeFalsy();
  browser.get('http://localhost:8080/#/list');
  browser.manage().window().maximize();
  browser.waitForAngular();
  userLogIn(name);
  userJoinQueue('dbas');
  expect(element(by.id('courseEdvardBtn')).isPresent()).toBeTruthy();
});

it('a User should be able to log on', function() {
    userLogIn(name);
    closeMOTD();
    expect(element(by.id('indexNameTextField')).getText()).toEqual('Edvard');
  });

it('a User should be able to choose a course and join a queue.', function() {
    userLogIn(name);
    userJoinQueue('dbas');
    expect(element(by.id('courseEdvardBtn')).isPresent()).toBeTruthy();
  });

it('a User should be able to leave a joined queue.', function() {
    userLogIn(name);
    userJoinQueue('dbas');
    element(by.id('courseLeaveQueueBtn')).click();
    expect(element(by.id('courseEdvardBtn')).isPresent()).toBeFalsy();
  });

it('The Student class will have the possibility the change their own data in the form of location commment and personal comment.', function() {
    userLogIn(name, student);
    $('#listdbasBtn').click();
    closeMOTD();
    $('#courseLocationInputField').sendKeys(location);
    $('#courseCommentInputField').sendKeys('comment1');
    $('#courseJoinQueueBtn').click();
    expect(element(by.id('courseEdvardBtn')).getText()).toMatch('1 Edvard Red comment1');
    $('#courseCommentInputField').clear();
    $('#courseLocationInputField').clear();
    $('#courseLocationInputField').sendKeys('Yellow');
    $('#courseCommentInputField').sendKeys('comment2');
    $('#courseUpdateInformationBtn').click()
    expect(element(by.id('courseEdvardBtn')).getText()).toMatch('1 Edvard Yellow comment2');
  });

it('The TA class is able to, by interaction, ‘Kick’ a User from the Queue', function(){
  userLogIn(name);
  userJoinQueue('dbas');
  browser.get('http://localhost:8080/#/list');
  browser.manage().window().maximize();
  browser.waitForAngular();
  adminLogIn('TA');
  $('#listdbasBtn').click();
  closeMOTD();
  browser.actions().doubleClick($('#course'+name+'Btn')).perform();
  $('#courseRemoveUser'+name+'Btn').click();
  expect(element(by.id('course'+name+'Btn')).isPresent()).toBeFalsy();
  });

it('TA is able to use the interaction ‘Lock’ or ‘Unlock’ with a queue', function(){  
 adminLogIn('TA');
 $('#listdbasBtn').click();
 $('#courseLockQueueBtn').click();
 browser.get('http://localhost:8080/#/list');
 browser.manage().window().maximize();
 browser.waitForAngular();
 userLogIn(name);
 $('#listdbasBtn').click();
 expect(browser.getCurrentUrl()).toMatch('http://localhost:8080/#/list');
 browser.get('http://localhost:8080/#/list');
 browser.manage().window().maximize();
 browser.waitForAngular();
 adminLogIn('TA');
 $('#listdbasBtn').click();
 $('#courseUnlockQueueBtn').click();
 browser.get('http://localhost:8080/#/list');
 browser.manage().window().maximize();
 browser.waitForAngular();
 userLogIn(name);
 $('#listdbasBtn').click();
 expect(browser.getCurrentUrl()).toMatch('http://localhost:8080/#/course/dbas');
  });

});