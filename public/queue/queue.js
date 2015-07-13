(function(){
  var app = angular.module("queue.queue", [
    'ui.bootstrap',
    'ngRoute',
    'queue.userDirective'
    ]);

  app.config(['$routeProvider',
    function($routeProvider) {
      $routeProvider.
      when('/queue/:queue', {
        templateUrl: 'queue/queue.html',
        controller: 'queueController'
      });
    }])


  .controller('queueController', ['$scope', 'HttpService', '$routeParams', '$location', '$modal', 'WebSocketService', 'UserService', 'TitleService', 'ModalService',
    function ($scope, http, $routeParams, $location, $modal, socket, user, title, modals) {
      var TIME_BOOKING = 1800000; // 30min in milliseconds

      $scope.queue = $routeParams.queue;
      $scope.info = "";

      $scope.$on('$destroy', function (event) {
        socket.removeAllListeners();
        console.log("Leaving " + $scope.queue);
        socket.emit('stopListening', $scope.queue);
      });
      socket.emit('listen', $scope.queue);

      title.title = $scope.queue + " | Stay A While";
      $scope.name = user.getName();
      $scope.users = [];
      $scope.bookedUsers = [];
      $scope.enqueued = false;

      $scope.accessLevel = user.accessLevelFor($scope.queue);

      $scope.locked = false;
      http.get('queue/' + $scope.queue, function(response) {
        console.log(response);
        $scope.users = response.queue;
        $scope.bookedUsers = response.bookings;
        $scope.info = response.info;
        // $scope.bookedUsers = [{time:Date.now(), comment:"MVK redovisning", users:["antbac", "pernyb", "rwb"], length:"15min", location:"Blue 01"}];
        console.log($scope.bookedUsers);
        $scope.locked = response.locked;
        for (var i = 0; i < $scope.users.length; i++) {
          $scope.users[i].optionsActivated = false;
          $scope.users[i].time = $scope.users[i].time/1000;
          if($scope.users[i].name === $scope.name){
            $scope.enqueued = true;
            title.title = "["  + (i+1) + "] " + $scope.queue + " | Stay A while";
            $scope.location = $scope.users[i].location;
            $scope.comment = $scope.users[i].comment;
            $scope.type = $scope.users[i].type;
          }
        }
        if(response.motd){
          $scope.MOTD = response.motd;
          modals.getModal({title: "Message of the day", message: response.motd, sender: ""});
        }
      });

      $scope.$watch(function() {
        return $scope.comment;
      }, function(newValue, oldValue) {
        if($scope.location && $scope.enqueued && $scope.type){
          socket.emit('update', {
            queueName: $scope.queue,
            user:{location: $scope.location, comment: $scope.comment, type: $scope.type}
          });
        }
      });

      $scope.$watch(function() {
        return $scope.location;
      }, function(newValue, oldValue) {
        if($scope.location && $scope.enqueued && $scope.type){
          socket.emit('update', {
            queueName: $scope.queue,
            user:{location: $scope.location, comment: $scope.comment, type: $scope.type}
          });
        }
      });

      $scope.$watch(function() {
        return $scope.type;
      }, function(newValue, oldValue) {
        console.log("$scope.type changed value to " + newValue);
        if($scope.location && $scope.enqueued && $scope.type){
          socket.emit('update', {
            queueName: $scope.queue,
            user:{location: $scope.location, comment: $scope.comment, type: $scope.type}
          });
        }
      });

      // Listen for the person joining a queue event.
      socket.on('join', function (data) {
        console.log("joining");
        if(data.name === $scope.name){
          $scope.enqueued = true;
          title.title = "["  + ($scope.users.length+1) + "] " + $scope.queue + " | Stay A while";
        }
        $scope.users.push({name: data.name, location: data.location, comment: data.comment, type: $scope.type, time: data.time/1000});
      });

      // Listen for the person leaving a queue event.
      socket.on('leave', function (data) {
        if(data.name === $scope.name){
          $scope.enqueued = false;
          $scope.comment = '';
          $scope.type = '';
          title.title = $scope.queue + " | Stay A while";
        }
        for(var i = $scope.users.length - 1; i >= 0; i--) {
          if($scope.users[i].name === data.name) {
            $scope.users.splice(i, 1);
            break;
          }
        }
        if($scope.enqueued){
          for(var j = $scope.users.length - 1; j >= 0; j--) {
            if($scope.users[j].name === $scope.name) {
              title.title = "["  + (j+1) + "] " + $scope.queue + " | Stay A while";
              break;
            }
          }
        }
      });

      // Listen for the person updateing a queue event.
      socket.on('purge', function () {
        $scope.users = [];
        $scope.enqueued = false;
      });

      // Listen for a user chageing their information
      socket.on('update', function (data) {
        console.log(data);
        for(var i = $scope.users.length - 1; i >= 0; i--) {
          if($scope.users[i].name === data.name) {
            $scope.users[i].comment = data.comment;
            $scope.users[i].location = data.location;
            $scope.users[i].type = data.type;
            break;
          }
        }
      });

      // Listen for a user being marked for completion
      socket.on('completion', function (data) {
        console.log(data);
        for(var i = $scope.users.length - 1; i >= 0; i--) {
          if($scope.users[i].name === data.name) {
            $scope.users[i].completion = true;
            break;
          }
        }
      });

      // Listen for a message.
      socket.on('msg', function (data) {
        console.log("Received message : " + data);
        modals.getModal({title: "Message", message: data.message, sender: "- " + data.sender});
      });

      // Listen for a user getting flagged
      socket.on('flag', function (data) {
        console.log("Flaggin " + data.name);
        for(var i = $scope.users.length - 1; i >= 0; i--) {
          if($scope.users[i].name === data.name) {
            if($scope.users[i].messages === undefined){
              $scope.users[i].messages = [data.message];
            }else{
              $scope.users[i].messages.push(data.message);
            }
            console.log("Pushed the message : " + data.message);
            break;
          }
        }
      });

      // Listen for a person getting help.
      socket.on('help', function (data) {
        for(var i = 0; i < $scope.users.length; i++){
          if($scope.users[i].name === data.name){
            $scope.users[i].gettingHelp = true;
            $scope.users[i].helper = data.helper;
            break;
          }
        }
      });

      // Listen for a person no longer getting help.
      socket.on('stopHelp', function (data) {
        for(var i = 0; i < $scope.users.length; i++){
          if($scope.users[i].name === data.name){
            $scope.users[i].gettingHelp = false;
            $scope.users[i].helper = data.helper;
            break;
          }
        }
      });

      // Listen for a new MOTD.
      socket.on('setMOTD', function (MOTD) {
        console.log("Backend wants to add the MOTD : " + JSON.stringify(MOTD));
        $scope.MOTD = MOTD.MOTD;
      });

      // Listen for new queue-info.
      socket.on('setInfo', function (Info) {
        console.log("Backend wants to change the queue-info to : " + JSON.stringify(Info));
        $scope.info = Info.info;
      });

      // Listen for locking the queue
      socket.on('lock', function (){
        $scope.locked = true;
      });

      // Listen for unlocking the queue
      socket.on('unlock', function (){
        $scope.locked = false;
      });

      // Listen for a badLocation warning
      socket.on('badLocation', function (data) {
        modals.getModal({
          title: "Unclear location",
          message: "The teaching assistant in '" + data.queueName + "' could not locate you. The teaching assistant won't try to find you again until you have updated your information.",
          sender: "- " + data.sender
        });
      });

      $scope.addUser = function(){
        if(!$scope.locked){
          if($scope.location === ""){
            alert("You must enter a location.");
          }else{
            console.log("Current time = " + Date.now());
            socket.emit('join',
            {
              queueName:$scope.queue,
              user:{location: $scope.location, comment: $scope.comment, type: $scope.type, time:Date.now()}
            });
            console.log("Called addUser");
          }
        }
      };

      // Leave the queue
      $scope.leave = function(){
        var wasBooked = false;
        if($scope.hasBooking({name:user.getName()})){
          var booking = getBooking(user.getName());
          if($scope.soon(booking)){
            wasBooked = true;
          }
        }
        socket.emit('leave', {
          queueName:$scope.queue,
          booking: wasBooked
        });
        console.log("Called leave");
      };

      // This function should remove every person in the queue
      $scope.purge = function(){
        console.log("Called purge");
        modals.confirmModal({
          title: "Are you sure you want to remove everyone in the queue?",
          text: "",
          confirmButton: {
            text: "Yes, kick them all out.",
            callback: function () {
              console.log("Purging the queue");
              socket.emit('purge', {
                queueName:$scope.queue
              });
            }
          },
          declineButton: {
            text: "No, leave them alone.",
            callback: function () {}
          }
        });
      };

      // This function should lock the queue, preventing anyone from queueing
      $scope.lock = function(){
        console.log("Called lock");
        socket.emit('lock', {
          queueName:$scope.queue
        });
        console.log("Leaving lock");
      };

      // This function should unlock the queue, alowing people to join the queue
      $scope.unlock = function(){
        socket.emit('unlock', {
          queueName:$scope.queue
        });
        console.log("Called unlock");
      };

      // This function allows the user to schedule labs (times when the queue will be unlocked)
      $scope.schedule = function(){
        modals.scheduleModal({
          title: "Schedule labs",
          remove: function () {
            socket.emit('removeSchedules', {queueName: $scope.queue});
          },
          add: function (schedule) {
            socket.emit('addSchedule', {queueName: $scope.queue, schedule: schedule});
          }
        });
      };

      // Function to send a message to every user in the queue
      $scope.broadcast = function(){
        console.log("Called broadcast");
        modals.submitModal({
          title: "Enter a message to broadcast",
          placeholder: "",
          buttonText: "Broadcast",
          callback: function (message) {
            console.log("Sending message");
            if(message){
              console.log("Message is = " + message);
              socket.emit('broadcast', {
                queueName: $scope.queue,
                message: message,
                sender: $scope.name
              });
            }
          }
        });
      };

      // Function to send a message to every TA handeling the queue
      $scope.broadcastTA = function(){
        console.log("Called broadcast");
        modals.submitModal({
          title: "Enter a message to broadcast to TAs",
          placeholder: "",
          buttonText: "Broadcast",
          callback: function (message) {
            console.log("Sending message");
            if(message){
              console.log("Sending message");
              console.log("$scope.queue = " + $scope.queue);
              socket.emit('broadcastFaculty', {
                queueName:$scope.queue,
                message:message,
                sender: $scope.name
              });
            }
          }
        });
      };

      // Function to add am essage of the day
      $scope.setMOTD = function(){
        console.log("Called setMOTD");
        modals.setModal({
          title: "Enter a new message of the day",
          placeholder: $scope.MOTD ? "Current MOTD: " + $scope.MOTD : "",
          removeButton: {text: "Remove MOTD", callback: function () {
            socket.emit('setMOTD', {
              queueName: $scope.queue,
              MOTD: "",
              sender: $scope.name
            });
          }},
          setButton: {text: "Set MOTD", callback: function (message) {
            if(message){
              socket.emit('setMOTD', {
                queueName: $scope.queue,
                MOTD: message,
                sender: $scope.name
              });
            }
          }}
        });
      };

      // Function to add am essage of the day
      $scope.setInfo = function(){
        console.log("Called setInfo");
        modals.setModal({
          title: "Enter new queue info",
          placeholder: "",
          removeButton: {text: "Remove info", callback: function () {
            socket.emit('setInfo', {
              queueName: $scope.queue,
              info: "",
              sender: $scope.name
            });
          }},
          setButton: {text: "Set info", callback: function (message) {
            if(message){
              socket.emit('setInfo', {
                queueName: $scope.queue,
                info: message,
                sender: $scope.name
              });
            }
          }}
        });
      };

      // When an admin wants to see the admin options
      $scope.changeVisibility = function(name){
        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
          for(var i = 0; i < $scope.users.length; i++){
            if($scope.users[i].name === name){
              $scope.users[i].optionsActivated = !$scope.users[i].optionsActivated;
              break;
            }
          }
        }else{
          if($scope.lastClick === name){
            if(Date.now() - $scope.clickTime <= 500){
              for(var j = 0; j < $scope.users.length; j++){
                if($scope.users[j].name === name){
                  $scope.users[j].optionsActivated = !$scope.users[j].optionsActivated;
                  break;
                }
              }
            }else{
              $scope.clickTime = Date.now();
            }
          }else{
            $scope.lastClick = name;
            $scope.clickTime = Date.now();
          }
        }
      };

      // When an admin wants to see the admin options
      // (This method is to prevent hiding the row when on a phone)
      $scope.changeVisibilityDbl = function(name){
        for(var i = 0; i < $scope.users.length; i++){
          if($scope.users[i].name === name){
            $scope.users[i].optionsActivated = !$scope.users[i].optionsActivated;
            break;
          }
        }
      };

      // This function should direct the user to the wanted page
      $scope.redirect = function(address){
        $location.hash("");
        $location.path('/' + address);
        $scope.location = $location.path();
        console.log("location = " + $scope.location);
      };

      // Return true if the booking is taking place approximately now
      $scope.soon = function(booking){
        return booking.time - Date.now() < TIME_BOOKING;
      };

      // Return true if any of the people in the group is in the queue
      $scope.attending = function(booking){
        var group = booking.users;
        for(var index in group){
          var name = group[index];
          if(present(name)){
            return true;
          }
        }
        return false;
      };

      // Return true if the person does not have a booking about now
      $scope.notHasBooking = function(user){
        return !$scope.hasBooking(user);
      };

      // Return true if the person has a booking about now
      $scope.hasBooking = function(user){
        var name = user.name;
        for(var index in $scope.bookedUsers){
          var booking = $scope.bookedUsers[index];
          for(var i in booking.users){
            var name1 = booking.users[i];
            if(name1 === name){
              if($scope.soon(booking)){
                if($scope.name === name){
                  title.title = $scope.queue + " | Stay A While";
                }
                return true;
              }
            }
          }
        }
        return false;
      };

      // Returns true if the given person is queueing at the moment, otherwise false
      function present (name) {
        for(var index in $scope.users){
          var name1 = $scope.users[index].name;
          if(name === name1){
            return true;
          }
        }
        return false;
      }

      // Returns true if the given person is queueing at the moment, otherwise false
      function getBooking (name) {
        for(var index in $scope.bookedUsers){
          var booking = $scope.bookedUsers[index];
          for(var i in booking.users){
            var name1 = booking.users[i];
            if(name1 === name){
              return booking;
            }
          }
        }
        return undefined;
      }

      // Returns an array of the groupmembers locations, empty if noone is queueing
      $scope.getLocations = function(group){
        console.log("Entered getLocations");
        var retList = [];
        for(var i in group){
          var name = group[i];
          for(var j in $scope.users){
            var name1 = $scope.users[j].name;
            if(name === name1){
              retList.push($scope.users[j].location);
              break;
            }
          }
        }
        return retList;
      };

      // This function checks if a person in the normal queue matches the search-string.
      $scope.match = function (user) {
        if(!$scope.search){
          return true;
        }
        var regEx = new RegExp($scope.search.toLowerCase());
        return regEx.test(user.location.toLowerCase()) || regEx.test(user.comment.toLowerCase()) || regEx.test(user.type.toLowerCase());
      };

      // This function checks if a person in the booked queue matches the search-string.
      $scope.matchBooked = function (user) {
        if(!$scope.search){
          return true;
        }
        var regEx = new RegExp($scope.search.toLowerCase());
        return (regEx.test(user.name.toLowerCase()) || regEx.test(user.location.toLowerCase()) ||  regEx.test(user.comment.toLowerCase()) ||  regEx.test(user.time.toLowerCase()));
      };
  }])
.directive('bookedUsers', function(){
  return {
    restrict: 'E',
    templateUrl: 'queue/bookedUsers.html'
  };
});
})();