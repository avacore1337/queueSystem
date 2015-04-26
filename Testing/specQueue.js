describe('Basic Queue Functionality:', function() {
var name = 'Edvard';
var location = 'Red';
var student = 'student';
var ta = 'Admin';

 beforeEach(function() {
    browser.get('http://localhost:8080/#/list');
    browser.manage().deleteAllCookies();
    browser.manage().window().maximize();
    browser.waitForAngular();
    adminLogIn('delete');
    element(by.id('listdbasBtn')).click();
    closeMOTD();
    element(by.id('coursePurgeQueueBtn')).click();
    acceptDialogue();
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
  element(by.id('loginUserRadio')).click();
  element(by.id('loginOKBtn')).click();
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
  element(by.id('loginAdminRadio')).click();
  element(by.id('loginOKBtn')).click();
 };


function closeMOTD(){
  browser.sleep(100);
  browser.switchTo().alert().then(
      function(alert) {  return alert.dismiss(); },
      function(err) { }
      );
};

function acceptDialogue(){
  browser.sleep(100);
  browser.switchTo().alert().then(
      function(alert) {  return alert.accept(); },
      function(err) { }
      );
};

function userJoinQueue(joinCourse){
  element(by.id('list'+joinCourse+'Btn')).click();
  closeMOTD();
  element(by.id('courseLocationInputField')).sendKeys(location);
  element(by.id('courseJoinQueueBtn')).click();
};

function newBrowser(){
  browser.get('http://localhost:8080/#/list');
  browser.manage().deleteAllCookies();
  browser.manage().window().maximize();
  browser.waitForAngular();
};


 afterEach(function(){
 });

it('he TA class is able to, by interaction, Purge the queue of all Users', function(){
  userLogIn(name);
  userJoinQueue('dbas');
  newBrowser();
  adminLogIn('TA');
  element(by.id('listdbasBtn')).click();
  closeMOTD();
  element(by.id('coursePurgeQueueBtn')).click();
  acceptDialogue();
  expect(element(by.id('courseEdvardBtn')).isPresent()).toBeFalsy();
  newBrowser();
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

it('Joining a queue with a booked time slot', function(){
 //TODO
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

it('Broadcasting in a Queue', function(){
 //TODO
});

it('The TA class is able to, by interaction, ‘Kick’ a User from the Queue', function(){
  userLogIn(name);
  userJoinQueue('dbas');
  newBrowser();
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
 newBrowser();
 userLogIn(name);
 $('#listdbasBtn').click();
 expect(browser.getCurrentUrl()).toMatch('http://localhost:8080/#/list');
 newBrowser();
 adminLogIn('TA');
 $('#listdbasBtn').click();
 $('#courseUnlockQueueBtn').click();
 newBrowser();
 userLogIn(name);
 $('#listdbasBtn').click();
 expect(browser.getCurrentUrl()).toMatch('http://localhost:8080/#/course/dbas');
  });

it('TA is able to use the interaction ‘new MOTD’ (Message of the Day) with a queue for a session which he is given privileges.', function(){
  //TODO
});

it('The users of class Teacher have the system rights to change other users user class within the group:', function(){
//TODO
});

it('The Teacher class is able to Hide or Reveal the Queue. Hiding the Queue will remove the Queue from the list of Queues for Users of the Student class', function(){
 adminLogIn('TA');
 $('#listdbasBtn').click();
 $('#courseHibernateQueueBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isDisplayed()).toBeFalsy();
 newBrowser();
 adminLogIn('TA');
 $('#listdbasBtn').click();
 $('#courseWakeupQueueBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isDisplayed()).toBeTruthy();
 userJoinQueue('dbas');
});



});