(function() {

  angular.module('queue')

  .factory('UserService', function($http) {

    var admin = false;

    var teacher = [];

    var assistant = [];

    var username = "";

    function updateUserData() {
      $http.get('/API/userData').success(function(response) {
        username = response.name;
        admin = response.admin;
        teacher = response.teacher;
        assistant = response.assistant;
      });
    }

    updateUserData();

    function isAssistant(queueName) {
      return $.inArray(queueName, assistant) !== -1;
    }

    function isTeacher(queueName) {
      return $.inArray(queueName, teacher) !== -1;
    }

    return {
      updateUserData: updateUserData,

      getName: function() {
        return username;
      },

      setName: function(name) {
        username = name;
      },

      isAdmin: function() {
        return admin;
      },

      setAdmin: function(bool) {
        admin = bool;
      },

      isTeacher: isTeacher,

      setTeacher: function(list) {
        teacher = list;
      },

      isAssistant: isAssistant,

      setAssistant: function(list) {
        assistant = list;
      },

      accessLevel: function() {
        var ret = 0;
        if (!username) {
          return -1;
        }
        if (assistant.length > 0) {
          ret = 1;
        }
        if (teacher.length > 0) {
          ret = 2;
        }
        if (admin) {
          ret = 3;
        }
        return ret;
      },

      accessLevelFor: function(queueName) {
        var ret = 0;
        if (!username) {
          return -1;
        }
        if (isAssistant(queueName)) {
          ret = 1;
        }
        if (isTeacher(queueName)) {
          ret = 2;
        }
        return ret;
      },

      clearName: function() {
        username = void 0;
      }
    };
  })

  .factory('WebSocketService', function($rootScope) {

    var socket = io.connect();
    return {
      on: function(eventName, callback) {
        socket.removeAllListeners(eventName);
        socket.on(eventName, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            callback.apply(socket, args);
          });
        });
      },
      emit: function(eventName, data, callback) {
        socket.emit(eventName, data, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      },
      // removeAllListeners: function(eventName, callback) { // Does not seem to work
      removeAllListeners: function(eventName, callback) { // Does not seem to work
        socket.removeAllListeners(eventName, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            callback.apply(socket, args);
          });
        });
      }
    };
  })

  .factory('TitleService', function() {

    return {
      title: "Stay A While"
    };
  })

  .factory('HttpService', function($http) {
    return {
      post: function(path, data, callback){
        $http.post('/API/' + path, data, {withCredentials: true}).success(callback);
      },
      get: function(path, callback){
        $http.get('/API/' + path).success(callback);
      }
    };
  })

  .factory('UserListService', ['HttpService', 'WebSocketService', '$modal',
    function(http, socket, $modal) {
    
    var userList = [];

    // Listen for the person joining a queue event.
    socket.on('join', function (data) {
      console.log("joined: " +data );
      userList.push({name:data.name, location:data.location, comment:data.comment, time:data.time/1000});
    });

    // Listen for the person leaving a queue event.
    socket.on('leave', function (data) {
      for(var index in userList) {
        if(userList[index].name === data.name) {
          userList.splice(i, 1);
          break;
        }
      }
    });

    // Listen for the person updateing a queue event.
    socket.on('purge', function () {
      userList = [];
    });

    // Listen for a user chageing their information
    socket.on('update', function (data) {
      for(var index in userList) {
        if(userList[i].name === data.name) {
          userList[i].comment = data.comment;
          userList[i].location = data.location;
          break;
        }
      }
    });

    // Listen for a user getting flagged
    socket.on('flag', function (data) {
      for(var index in userList) {
        if(userList[i].name === data.name) {
          $scope.users[i].messages.push(data.message);
          break;
        }
      }
    });

    // Listen for a person getting help.
    socket.on('help', function (data) {
      for(var index in userList) {
        if(userList[i].name === data.name) {
          $scope.users[i].gettingHelp = true;
          break;
        }
      }
    });

    // Listen for a badLocation warning
    socket.on('badLocation', function (data) {
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
            return "The teaching assistant in '" + data.queueName + "' could not locate you. The teaching assistant won't try to find you again until you have updated your information.";
          },
          sender: function () {
            return "- " + data.sender;
          }
        }
      });
    });

    return {
      updateUsers: function(queueName) {
        http.get('queue/' + queueName, function(response) {
          userList = response.queue;
        });
      },
      getUsers: function () {
        return userList;
      }
    };
  }])

  .factory('ModalService', ['$modal',
    function($modal) {

      return {
        setModal: function (args) {
            var modalInstance = $modal.open({
            templateUrl: 'modals/setModal.html',
            controller: function ($scope, $modalInstance, title, placeholder, buttons) {
              $scope.title = title;
              $scope.placeholder = placeholder;
              $scope.buttons = buttons;
              $scope.clicked = function (index) {
                console.log("Clicked " + buttons[index].text + " and the message is : " + $scope.message);
                $modalInstance.close({index: index, message: $scope.message});
              };
            },
            resolve: {
              title: function () {
                return args.title;
              },
              placeholder: function () {
                return args.placeholder;
              },
              buttons: function () {
                return args.buttons;
              }
            }
          });

          modalInstance.result.then(function (output) {
            console.log("Received message is : " + output.message);
            args.buttons[output.index].callback(output.message);
          }, function () {});
        },
        getModal: function (args) {
          var modalInstance = $modal.open({
            templateUrl: 'modals/getModal.html',
            controller: function ($scope, $modalInstance, title, message, sender) {
              $scope.title = title;
              $scope.message = message;
              $scope.sender = sender;
            },
            resolve: {
              title: function () {
                return args.title;
              },
              message: function () {
                return args.message;
              },
              sender: function () {
                return args.sender;
              }
            }
          });
        }
      };
    }
  ]);

})();