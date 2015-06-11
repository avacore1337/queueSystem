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
      var TIME_BOOKING = 1800000; // 30min in milliseconds

      $scope.queue = $routeParams.queue;

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

      $scope.accessLevel = 0;
      if(user.isAssistant($scope.queue)){
        $scope.accessLevel = 1;
      }
      if(user.isTeacher($scope.queue)){
        $scope.accessLevel = 2;
      }

      $scope.locked = false;
      $http.get('/API/queue/' + $scope.queue)
      .success(function(response) {
        $scope.users = response.queue;
        $scope.bookedUsers = response.bookings;
        //$scope.bookedUsers = [{time:Date.now(), comment:"MVK redovisning", users:["antbac", "pernyb", "rwb"], length:"15min", location:"Blue bitch 01"}];
        $scope.locked = response.locked;
        for (var i = 0; i < $scope.users.length; i++) {
          $scope.users[i].optionsActivated = false;
          $scope.users[i].time = $scope.users[i].time/1000;
          if($scope.users[i].name === $scope.name){
            $scope.enqueued = true;
            title.title = "["  + (i+1) + "] " + $scope.queue + " | Stay A while";
            $scope.location = $scope.users[i].location;
            $scope.comment = $scope.users[i].comment;
          }
        }
        if(response.motd){
          $scope.MOTD = response.motd;
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
                return "";
              }
            }
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
      $scope.users.push({name:data.name, location:data.location, comment:data.comment, time:data.time/1000});
    });

    // Listen for the person leaving a queue event.
    socket.on('leave', function (data) {
      if(data.name === $scope.name){
        $scope.enqueued = false;
        $scope.comment = '';
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
    socket.on('purge', function socketPurge() {
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
          break;
        }
      }
      console.log($scope.users);
    });

    // Listen for a message.
    socket.on('msg', function (data) {
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
            return "- " + data.sender;
          }
        }
      });
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

    // Listen for a new MOTD.
    socket.on('addMOTD', function (MOTD) {
      console.log("Backend wants to add the MOTD : " + MOTD);
      $scope.MOTD = MOTD;
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
            user:{name:$scope.name, location:$scope.location, comment:$scope.comment, time:Date.now()}
          });
          console.log("Called addUser");
        }
      }
    };

    $scope.updateUser = function(){
      if($scope.location === ""){
        alert("You must enter a location.");
      }else{
        socket.emit('update', {
          queueName:$scope.queue,
          user:{name:$scope.name, location:$scope.location, comment:$scope.comment}
        });
        console.log("Called updateUser");
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
        user:{name:user.getName()},
        booking: wasBooked
      });
      console.log("Called leave");
    };

    // Kick a user from the queue
    $scope.kick = function(name){
      socket.emit('kick', {
        queueName:$scope.queue,
        user:{name:name}
      });
      console.log("Called kick");
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
            queueName:$scope.queue
          });
        }
      }, function () {});
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

    // Mark the user as being helped
    $scope.helpUser = function(name){
      socket.emit('help', {
        queueName:$scope.queue,
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
        if(message){
          console.log("Sending message now");
          socket.emit('messageUser', {
            queueName:$scope.queue,
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
            queueName:$scope.queue,
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
            queueName:$scope.queue,
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
        if(message){
          console.log("Sending message");
          console.log("$scope.queue = " + $scope.queue);
          socket.emit('broadcastFaculty', {
            queueName:$scope.queue,
            message:message,
            sender: $scope.name
          });
        }
      }, function () {});
    };

    // Function to send a message to a user
    $scope.badLocation = function(name){
      socket.emit('badLocation', {
        queueName:$scope.queue,
        name:name
      });
      console.log("Called badLocation");
    };

    // Function to add am essage of the day
    $scope.addMOTD = function(){
      console.log("Called addMOTD");
      var modalInstance = $modal.open({
        templateUrl: 'editMOTD.html',
        controller: function ($scope, $modalInstance, title, placeholder, buttonEdit, buttonRemove) {
          $scope.title = title;
          $scope.placeholder = placeholder;
          $scope.buttonEdit = buttonEdit;
          $scope.buttonRemove = buttonRemove;
          $scope.edit = function () {
            $modalInstance.close($scope.message);
          };
          $scope.remove = function () {
            $modalInstance.close("");
          };
        },
        resolve: {
          title: function () {
            return "Enter a new message of the day";
          },
          placeholder: function () {
            if($scope.MOTD){
              return "Current MOTD: " + $scope.MOTD;
            }else{
              return "";
            }
          },
          buttonEdit: function () {
            return "Edit MOTD";
          },
          buttonRemove: function () {
            return "Remove MOTD";
          }
        }
      });

      modalInstance.result.then(function (MOTD) {
        console.log("MOTD = " + MOTD);
        if(MOTD !== undefined){
          socket.emit('addMOTD', {
            queueName:$scope.queue,
            MOTD:MOTD,
            sender: $scope.name
          });
        }
      }, function () {});
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
    }

  // This function should direct the user to the wanted page
  $scope.redirect = function(address){
    $location.hash("");
    $location.path('/' + address);
    $scope.location = $location.path();
    console.log("location = " + $scope.location);
  };

  // Return true if the booking is taking place approximately now
  $scope.soon = function(booking){
    return Math.abs(booking.time - Date.now()) < TIME_BOOKING;
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

  // This function checks if a person in the normal queue matches the search-string.
  $scope.match = function (user) {
    if(!$scope.search){
      return true;
    }
    var regEx = new RegExp($scope.search.toLowerCase());
    return regEx.test(user.location.toLowerCase()) || regEx.test(user.comment.toLowerCase());
  };

  // This function checks if a person in the booked queue matches the search-string.
  $scope.matchBooked = function (user) {
    if(!$scope.search){
      return true;
    }
    var regEx = new RegExp($scope.search.toLowerCase());
    return (regEx.test(user.name.toLowerCase()) || regEx.test(user.location.toLowerCase()) ||  regEx.test(user.comment.toLowerCase()) ||  regEx.test(user.time.toLowerCase()));
  };
  }]);
})();