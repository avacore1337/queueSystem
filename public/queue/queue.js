(function(){
  var app = angular.module("queue.queue", [
    'ui.bootstrap',
    'ngRoute'
    ]);
  
  app.config(['$routeProvider',
    function($routeProvider) {
      $routeProvider.
      when('/queue/:queue', {
        templateUrl: 'queue/queue.html',
        controller: 'queueController'
      });
    }])


  .controller('queueController', ['$scope', '$http', '$routeParams', '$location', '$modal', 'WebSocketService', 'UserService', 'TitleService',
    function ($scope, $http, $routeParams, $location, $modal, socket, user, title) {
      $scope.queue = $routeParams.queue;
      title.title = $scope.queue + " | Stay A While";
      $scope.name = user.getName();
      $scope.users = [];
      $scope.bookedUsers = [];
      $scope.enqueued = false;

      $scope.accessLevel = 0;
      if(user.isAssistant($scope.queue)){
        $scope.accessLevel = 1;
      }
      if(user.isTeacher($scope.queue)){
        $scope.accessLevel = 2;
      }

      $scope.locked = false;
      $scope.hibernating = false;
      $http.get('/API/queue/' + $routeParams.queue)
      .success(function(response) {
        $scope.users = response.queue;
        $scope.locked = response.locked;
        $scope.hibernating = response.hibernating;
        for (var i = 0; i < $scope.users.length; i++) {
          $scope.users[i].optionsActivated = false;
          $scope.users[i].time = $scope.users[i].time/1000;
          if($scope.users[i].name === $scope.name){
            $scope.enqueued = true;
            title.title = "["  + (i+1) + "] " + $scope.queue + " | Stay A while";
            $scope.location = $scope.users[i].place;
            $scope.comment = $scope.users[i].comment;
          }
        }
        if(response.motd){
          var modalInstance = $modal.open({
            templateUrl: 'receiveMessage.html',
            controller: function ($scope, $modalInstance, title, message, sender) {
              $scope.title = title;
              $scope.message = message;
              $scope.sender = sender;
            },
            resolve: {
              title: function () {
                return "Message of the day";
              },
              message: function () {
                return response.motd;
              },
              sender: function () {
                return "Some admin";
              }
            }
          });
        }
      });

$scope.$on("$destroy", function(){
  console.log("Bye bye!");
  socket.removeListener('join', socketJoin);
  socket.removeListener('leave', socketLeave);
  socket.removeListener('update', socketUpdate);
  socket.removeListener('purge', socketPurge);
  socket.removeListener('msg', socketMsg);
  socket.removeListener('flag', socketFlag);
  socket.removeListener('help', socketHelp);
  socket.removeListener('lock', socketLock);
  socket.removeListener('unlock', socketUnlock);
  socket.removeListener('badLocation', socketBadLocation);
});

// TODO : Remove this when you connect the two backends
$scope.bookedUsers = [
{name:'Anton',  place:"Red 01" , comment:"Labb 1", time:"15:00"},
{name:'Joakim',  place:"Red 06" , comment:"Labb 3", time:"15:30"},
{name:'Per',  place:"Red 07" , comment:"Labb 2", time:"16:00"}
];

socket.emit('stopListening', 'lobby');
socket.emit('listen', $scope.queue);

console.log('testing');

    // Listen for the person joining a queue event.
    function socketJoin(data) {
      console.log("joining");
      if(data.name === $scope.name){
        $scope.enqueued = true;
        title.title = "["  + ($scope.users.length+1) + "] " + $scope.queue + " | Stay A while";
      }
      $scope.$apply($scope.users.push({name:data.name, place:data.place, comment:data.comment, time:data.time/1000}));
    }
    socket.on('join', socketJoin);

    // Listen for the person leaving a queue event.
    function socketLeave(data) {
      if(data.name === $scope.name){
        $scope.enqueued = false;
        $scope.comment = '';
        title.title = $scope.queue + " | Stay A while";
      }
      for(var i = $scope.users.length - 1; i >= 0; i--) {
        if($scope.users[i].name === data.name) {
          $scope.$apply($scope.users.splice(i, 1));
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
    }
    socket.on('leave', socketLeave);

    // Listen for the person updateing a queue event.
    function socketUpdate(data) {
      console.log(data);
      for(var i = $scope.users.length - 1; i >= 0; i--) {
        if($scope.users[i].name === data.name) {
          $scope.$apply($scope.users[i].comment = data.comment);
          $scope.$apply($scope.users[i].place = data.place);
          break;
        }
      }
      console.log($scope.users);
    }
    socket.on('update', socketUpdate);

    // Listen for an admin purging the queue.
    function socketPurge() {
      $scope.$apply($scope.users = []);
      $scope.$apply($scope.enqueued = false);
    }
    socket.on('purge', socketPurge);

    // Listen for a message.
    function socketMsg(data) {
      console.log("Received message : " + data);
      var modalInstance = $modal.open({
        templateUrl: 'receiveMessage.html',
        controller: function ($scope, $modalInstance, title, message, sender) {
          $scope.title = title;
          $scope.message = message;
          $scope.sender = sender;
        },
        resolve: {
          title: function () {
            return "Message";
          },
          message: function () {
            return data.message;
          },
          sender: function () {
            return data.sender;
          }
        }
      });
    }
    socket.on('msg', socketMsg);

    // Listen for a user getting flagged
    function socketFlag(data) {
      console.log("Flaggin " + data.name);
      for(var i = $scope.users.length - 1; i >= 0; i--) {
        if($scope.users[i].name === data.name) {
          if($scope.users[i].messages === undefined){
            $scope.$apply($scope.users[i].messages = [data.message]);
          }else{
            $scope.$apply($scope.users[i].messages.push(data.message));
          }
          console.log("Pushed the message : " + data.message);
          break;
        }
      }
    }
    socket.on('flag', socketFlag);

    // Listen for a person getting help.
    function socketHelp(data) {
      for(var i = 0; i < $scope.users.length; i++){
        if($scope.users[i].name === data.name){
          $scope.$apply($scope.users[i].gettingHelp = true);
          $scope.$apply($scope.users[i].helper = data.helper);
          break;
        }
      }
    }
    socket.on('help', socketHelp);

    // Listen for locking the queue
    function socketLock(){
      $scope.$apply($scope.locked = true);
    }
    socket.on('lock', socketLock);

    // Listen for unlocking the queue
    function socketUnlock(){
      $scope.$apply($scope.locked = false);
    }
    socket.on('unlock', socketUnlock);

    // Listen for a badLocation warning
    function socketBadLocation(data) {
      console.log("badLocation detected !!!");
      console.log("Sender : " + data.sender);
      if($scope.name === data.name){
        var modalInstance = $modal.open({
          templateUrl: 'receiveMessage.html',
          controller: function ($scope, $modalInstance, title, message, sender) {
            $scope.title = title;
            $scope.message = message;
            $scope.sender = sender;
          },
          resolve: {
            title: function () {
              return "Unclear location";
            },
            message: function () {
              return "You have to enter a more descriptive location.";
            },
            sender: function () {
              return data.sender;
            }
          }
        });
      }else{
        console.log("No worries, it wasn't you.");
      }
    }
    socket.on('badLocation', socketBadLocation);

    $scope.addUser = function(){
      if(!$scope.locked && !$scope.hibernating){
        if($scope.location === ""){
          alert("You must enter a place.");
        }else{
          console.log("Current time = " + Date.now());
          socket.emit('join',
          {
            queue:$routeParams.queue,
            user:{name:$scope.name, place:$scope.location, comment:$scope.comment, time:Date.now()}
          });
          console.log("Called addUser");
        }
      }
    };

    $scope.updateUser = function(){
      if($scope.location === ""){
        alert("You must enter a place.");
      }else{
        socket.emit('update', {
          queue:$routeParams.queue,
          user:{name:$scope.name, place:$scope.location, comment:$scope.comment}
        });
        console.log("Called updateUser");
      }
    };

    $scope.removeUser = function(name){
      var tempPlace = '';
      var tempComment = '';
      for(var user in $scope.users){
        if(name == user.name){
          tempPlace = user.place;
          tempComment = user.comment;
          break;
        }
      }
      console.log("tempPlace = " + tempPlace + " :  tempPlace = " + tempComment);
      socket.emit('leave', {
        queue:$routeParams.queue,
        user:{name:name, place:tempPlace, comment:tempComment}
      });
      console.log("Called removeUser");
    };

    // This function should remove every person in the queue
    $scope.purge = function(){
      console.log("Called purge");
      var modalInstance = $modal.open({
        templateUrl: 'purgeQueue.html',
        controller: function ($scope, $modalInstance) {
          $scope.purge = function () {
            $modalInstance.close("purge");
          };
          $scope.doNotPurge = function () {
            $modalInstance.close("");
          };
        },
        resolve: {}
      });

      modalInstance.result.then(function (message) {
        if(message === "purge"){
          socket.emit('purge', {
            queue:$routeParams.queue
          });
        }
      }, function () {});
    };

    // This function should lock the queue, preventing anyone from queueing
    $scope.lock = function(){
      console.log("Called lock");
      socket.emit('lock', {
        queue:$routeParams.queue
      });
      console.log("Leaving lock");
    };

    // This function should unlock the queue, alowing people to join the queue
    $scope.unlock = function(){
      socket.emit('unlock', {
        queue:$routeParams.queue
      });
      console.log("Called unlock");
    };

    // Mark the user as being helped
    $scope.helpUser = function(name){
      socket.emit('help', {
        queue:$routeParams.queue,
        name:name,
        helper:$scope.name
      });
      console.log("Called helpUser");
    };

    $scope.messageUser = function (name) {
      console.log("Entered messageUser");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a message to " + name;
          },
          buttonText: function () {
            return "Send";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('messageUser', {
            queue:$routeParams.queue,
            sender:$scope.name,
            name:name,
            message:message
          });
        }
      }, function () {});
    };

    // Function to add a message about that user
    $scope.flag = function(name){
      console.log("Entered flag");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a comment about " + name;
          },
          buttonText: function () {
            return "Add comment";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('flag', {
            queue:$routeParams.queue,
            sender:$scope.name,
            name:name,
            message:message
          });
        }
      }, function () {});
    };

    // Function to read comments about a user
    $scope.readMessages = function(name){
      console.log("Called readMessages");
      for(var index in $scope.users){
        if($scope.users[index].name === name){
          var modalInstance = $modal.open({
            templateUrl: 'readMessages.html',
            controller: function ($scope, $modalInstance, messages) {
              $scope.messages = messages;
            },
            resolve: {
              messages: function () {
                return $scope.users[index].messages;
              }
            }
          });
          break;
        }
      }
    };

    // Function to send a message to every user in the queue
    $scope.broadcast = function(){
      console.log("Called broadcast");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a message to broadcast";
          },
          buttonText: function () {
            return "Broadcast";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('broadcast', {
            queue:$routeParams.queue,
            message:message,
            sender: $scope.name
          });
        }
      }, function () {});
    };

    // Function to send a message to every TA handeling the queue
    $scope.broadcastTA = function(){
      console.log("Called broadcast");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a message to broadcast to TAs";
          },
          buttonText: function () {
            return "Broadcast";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('broadcastTA', {
            queue:$routeParams.queue,
            message:message,
            sender: $scope.name
          });
        }
      }, function () {});
    };

    // Function to send a message to a user
    $scope.badLocation = function(name){
      socket.emit('badLocation', {
        queue:$routeParams.queue,
        name:name
      });
      console.log("Called badLocation");
    };

    // When an admin wants to see the admin options
    $scope.changeVisibility = function(name){
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

  // This function checks if a person in the normal queue matches the search-string.
  $scope.match = function (user) {
    if(!$scope.search){
      return true;
    }
    var regEx = new RegExp($scope.search.toLowerCase());
    return regEx.test(user.place.toLowerCase()) || regEx.test(user.comment.toLowerCase());
  };

    // This function checks if a person in the booked queue matches the search-string.
    $scope.matchBooked = function (user) {
      if(!$scope.search){
        return true;
      }
      var regEx = new RegExp($scope.search.toLowerCase());
      return (regEx.test(user.name.toLowerCase()) || regEx.test(user.place.toLowerCase()) ||  regEx.test(user.comment.toLowerCase()) ||  regEx.test(user.time.toLowerCase()));
    };
  }]);
})();