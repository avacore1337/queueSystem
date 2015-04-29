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
    element(by.id('queueOptionsBtn')).click();
    element(by.id('queuePurgeQueueBtn')).click();
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
  //browser.sleep(100);
  //browser.switchTo().alert().then(
  //    function(alert) {  return alert.accept(); },
  //   function(err) { }
  //    );
  element(by.id('queueDoPurgeBtn')).click();
};

function userJoinQueue(joinQueue){
  element(by.id('list'+joinQueue+'Btn')).click();
  closeMOTD();
  element(by.id('queueLocationInputField')).sendKeys(location);
  element(by.id('queueJoinQueueBtn')).click();
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
  element(by.id('queueOptionsBtn')).click();
  element(by.id('queuePurgeQueueBtn')).click();
  acceptDialogue();
  expect(element(by.id('queueEdvardBtn')).isPresent()).toBeFalsy();
  newBrowser();
  userLogIn(name);
  userJoinQueue('dbas');
  expect(element(by.id('queueEdvardBtn')).isPresent()).toBeTruthy();
});

it('a User should be able to log on', function() {
    userLogIn(name);
    closeMOTD();
    expect(element(by.id('indexNameTextField')).getText()).toEqual('Edvard');
  });

it('a User should be able to choose a queue and join a queue.', function() {
    userLogIn(name);
    userJoinQueue('dbas');
    expect(element(by.id('queueEdvardBtn')).isPresent()).toBeTruthy();
  });

it('a User should be able to leave a joined queue.', function() {
    userLogIn(name);
    userJoinQueue('dbas');
    element(by.id('queueLeaveQueueBtn')).click();
    expect(element(by.id('queueEdvardBtn')).isPresent()).toBeFalsy();
  });

it('Joining a queue with a booked time slot', function(){
 //TODO
});

it('The Student class will have the possibility the change their own data in the form of location commment and personal comment.', function() {
    userLogIn(name, student);
    $('#listdbasBtn').click();
    closeMOTD();
    $('#queueLocationInputField').sendKeys(location);
    $('#queueCommentInputField').sendKeys('comment1');
    $('#queueJoinQueueBtn').click();
    expect(element(by.id('queueEdvardBtn')).getText()).toMatch('1 Edvard Red comment1');
    $('#queueCommentInputField').clear();
    $('#queueLocationInputField').clear();
    $('#queueLocationInputField').sendKeys('Yellow');
    $('#queueCommentInputField').sendKeys('comment2');
    $('#queueUpdateInformationBtn').click()
    expect(element(by.id('queueEdvardBtn')).getText()).toMatch('1 Edvard Yellow comment2');
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
  browser.actions().doubleClick($('#queue'+name+'Btn')).perform();
  $('#queueRemoveUser'+name+'Btn').click();
  expect(element(by.id('queue'+name+'Btn')).isPresent()).toBeFalsy();
  });

it('TA is able to use the interaction ‘Lock’ or ‘Unlock’ with a queue', function(){  
 adminLogIn('TA');
 $('#listdbasBtn').click();
 element(by.id('queueOptionsBtn')).click();
 $('#queueLockQueueBtn').click();
 newBrowser();
 userLogIn(name);
 $('#listdbasBtn').click();
 expect(browser.getCurrentUrl()).toMatch('http://localhost:8080/#/list');
 newBrowser();
 adminLogIn('TA');
 $('#listdbasBtn').click();
 element(by.id('queueOptionsBtn')).click();
 $('#queueUnlockQueueBtn').click();
 newBrowser();
 userLogIn(name);
 $('#listdbasBtn').click();
 expect(browser.getCurrentUrl()).toMatch('http://localhost:8080/#/queue/dbas');
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
 $('#queueHibernateQueueBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isDisplayed()).toBeFalsy();
 newBrowser();
 adminLogIn('TA');
 $('#listdbasBtn').click();
 $('#queueWakeupQueueBtn').click();
 newBrowser();
 userLogIn(name);
 expect($('#listdbasBtn').isDisplayed()).toBeTruthy();
 userJoinQueue('dbas');
});



});