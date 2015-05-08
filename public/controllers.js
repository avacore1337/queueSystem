var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('listController', ['$scope', '$http', '$location', 'WebSocketService', 'UserService', 'TitleService',
  function ($scope, $http, $location, socket, user, title) {
    title.title = "Stay A While";
    $scope.queues = [];
    $http.get('/API/queueList').success(function(response){
      $scope.queues = response.sort(function(a, b) {return a.name.localeCompare(b.name);});
    });

    console.log("API/userData");
    $http.get('/API/userData').success(function(response){
      console.log("User from API = " + JSON.stringify(response));
      console.log("User from service = " + JSON.stringify(user));
      user.setName(response.name);
      user.setAdmin(response.admin);
      user.setTeacher(response.teacher);
      user.setAssistant(response.assistant);
      console.log("Now the user from service = " + JSON.stringify(user));
    });

    socket.emit('listen', 'lobby');

  // Listen for a person joining a queue.
  socket.on('lobbyjoin', function(queue) {
    console.log("A user joined (lobby) " + queue);
    $scope.$apply(getQueue(queue).length++);
  });

  // Listen for a person leaving a queue.
  socket.on('lobbyleave', function(queue) {
    console.log("A user left (lobby) " + queue);
    $scope.$apply(getQueue(queue).length--);
  });

  // Listen for queue geting purged.
  socket.on('lobbypurge', function(queue) {
    console.log(queue + " was purged (lobby)");
    $scope.$apply(getQueue(queue).length = 0);
  });

  // Listen for a queue being locked.
  socket.on('lobbylock', function(queue) {
    console.log(queue + " was locked (lobby)");
    $scope.$apply(getQueue(queue).locked = true);
  });

  // Listen for a queue being unlocked.
  socket.on('lobbyunlock', function(queue) {
    console.log(queue + " was unlocked (lobby)");
    $scope.$apply(getQueue(queue).locked = false);
  });

  // Listen for a queue going to sleep.
  socket.on('lobbyhibernate', function(queue) {
    console.log(queue + " was sent to sleep (lobby)");
    $scope.$apply(getQueue(queue).hibernating = true);
  });

  // Listen for a queue waking up.
  socket.on('lobbyunhibernate', function(queue) {
    console.log(queue + " was awoken (lobby)");
    $scope.$apply(getQueue(queue).hibernating = false);
  });

  function getQueue (queue) {
    for(var index in $scope.queues){
      if($scope.queues[index].name === queue){
        return $scope.queues[index];
      }
    }
  }
  // This function should direct the user to the wanted page
  $scope.redirect = function(queue){
    console.log("Trying to enter queue : " + queue.name);
    if(!queue.locked || $scope.accessLevel(queue.name) > 0){
      console.log("Allowed to enter queue : " + queue.name);
      $location.hash("");
      $location.path('/queue/' + queue.name);
    }
  };

  $scope.accessLevel = function (queueName) {
    var ret = 0;
    if(user.username === ""){
      return ret;
    }
    if(user.isAssistant(queueName)){
      ret = 1;
    }
    if(user.isTeacher(queueName)){
      ret = 2;
    }
    if(user.isAdmin()){
      ret = 3;
    }
    return ret;
  };

  $scope.noMatch = function (queueName) {
    if(!$scope.search){
      return false;
    }
    return !(new RegExp($scope.search).test(queueName));
  };

}]);

queueControllers.controller('aboutController', ['$scope', 'TitleService',
  function ($scope, title) {
    title.title = "About | Stay A While";
    console.log('entered about.html');
  }]);

queueControllers.controller('helpController', ['$scope', '$http', 'TitleService', 'UserService',
  function ($scope, $http, title, user) {
    title.title = "Help | Stay A While";
    console.log('entered help.html');
    if(!user.username){
      $scope.accessLevel = -1;
    }else{
      $scope.accessLevel = 0;
      if(user.assistant.length > 0){
        $scope.accessLevel = 1;
      }
      if(user.teacher.length > 0){
        $scope.accessLevel = 2;
      }
      if(user.isAdmin()){
        $scope.accessLevel = 3;
      }
    }
    console.log("$scope.accessLevel = " + $scope.accessLevel);
  }]);

queueControllers.controller('statisticsController', ['$scope', '$http', 'WebSocketService', 'TitleService', 'UserService',
  function ($scope, $http, socket, title, user) {
    title.title = "Statistics | Stay A While";
    console.log('entered statistics.html');

    socket.emit('stopListening', 'lobby');
    socket.emit('listen', 'statistics');

    // Listen for new statistics.
    socket.on('getAverageQueueTime', function(milliseconds) {
      var seconds = (milliseconds / 1000) % 60 ;
      var minutes = (milliseconds / (1000*60)) % 60;
      var hours   = (milliseconds / (1000*60*60)) % 24;
      if(hours > 1){
        $scope.averageQueueTime = Math.floor(hours) + "h " + Math.floor(minutes) + "m " + Math.floor(seconds) + "s";
      }else if(minutes > 1){
        $scope.averageQueueTime = Math.floor(minutes) + "m " + Math.floor(seconds) + "s";
      }else if(seconds > 1){
        $scope.averageQueueTime = Math.floor(seconds) + "s";
      }else{
        $scope.averageQueueTime = "0s";
      }
      $scope.$apply();
    });
    $scope.averageQueueTime = "";

    // Listen for new statistics.
    socket.on('numbersOfPeopleLeftQueue', function(amount) {
      $scope.$apply($scope.numbersOfPeopleLeftQueue = amount);
      console.log("Amount to 'numbersOfPeopleLeftQueue' : " + amount);
    });
    $scope.numbersOfPeopleLeftQueue = -1;

    // Queue selection
    $scope.queues = [];
    $http.get('/API/queueList').success(function(response){
      var temp = response.sort(function(a, b) {return a.name.localeCompare(b.name);});
      for(var index in temp){
        if(user.isAdmin() || user.isTeacher(temp[index].name)){
          $scope.queues.push(temp[index]);
        }
      }
    });

    $scope.selectedQueue = undefined;
    $scope.selectQueue = function(queue){
      $scope.selectedQueue = queue;
      document.getElementById('dropdown').innerHTML = queue.name;
      console.log("selected queue = " + $scope.selectedQueue);
    };

    // Date
    $scope.today = function() {
      $scope.dtFrom = new Date();
      $scope.dtTo = new Date();
      $scope.today = new Date();
    };
    $scope.today();

    $scope.open = function($event, opened) {
      $event.preventDefault();
      $event.stopPropagation();

      $scope[opened] = true;
    };

    // Time
    $scope.fromTime = new Date();
    $scope.fromTime.setHours(0);
    $scope.fromTime.setMinutes(0);
    $scope.toTime = new Date();

    $scope.hstep = 1;
    $scope.mstep = 1;

    // Statistics
    $scope.getStatistics = function() {
      console.log($scope.selectedQueue);
      socket.emit('getAverageQueueTime', {
        queueName:$scope.selectedQueue.name,
        start:$scope.fromTime.getTime(),
        end:$scope.toTime.getTime()
      });
      console.log("Requested averageQueueTime");
      socket.emit('numbersOfPeopleLeftQueue', {
        queueName:$scope.selectedQueue.name,
        start:$scope.fromTime.getTime(),
        end:$scope.toTime.getTime()
      });
      console.log("Requested numbersOfPeopleLeftQueue");
    };

    $scope.accessLevel = function() {
      var ret = 0;
      if(!user.username){
        return ret;
      }
      if(user.assistant.length > 0){
        ret = 1;
      }
      if(user.teacher.length > 0){
        ret = 2;
      }
      if(user.isAdmin()){
        ret = 3;
      }
      return ret;
    };

  }]);

queueControllers.controller('loginController', ['$scope', '$location', '$http', 'TitleService', 'WebSocketService',
  function ($scope, $location, $http, title, socket) {
    title.title = "Log in | Stay A While";

    socket.emit('listen', 'lobby');

    $scope.done = function () {
      console.log("Reached done()");
      $http.post('/API/setUser', {
        name: $scope.name
      },
      {withCredentials: true}).success(function(response){
        console.log("with credentials success");
        $location.path('list');
        console.log("logged in");
      });
      console.log("I set the user with http");
      // TODO : This should be removed later on
      // TODO : Robert look here
      socket.emit('setUser', {
        name: $scope.name,
        admin: $scope.type === 'admin'
      });
      console.log("I set the user with socket");
    };

  }]);

queueControllers.controller('navigationController', ['$scope', '$location', 'UserService', '$http',
  function ($scope, $location, user, $http) {
    $scope.location = $location.path();
    $scope.name = user.username;

    $scope.$watch(function () { return $location.path(); }, function(newValue, oldValue) {
      $scope.location = newValue;
      console.log("Detected update to $location.path() (oldValue = " + oldValue + ", newValue = " + newValue + ")");
    });

    $scope.$watch(function () { return user.username; }, function(newValue, oldValue) {
      $scope.name = newValue;
      console.log("Detected update to user.username (oldValue = " + oldValue + ", newValue = " + newValue + ")");
    });

    // Loggin out
    $scope.logOut = function(){
      $http.post('/API/setUser', {
        name: "",
        admin: false,
        teacher: [],
        assistant: []
      },
      {withCredentials: true}).success(function(response){
        user.setName("");
        $scope.name = "";
        console.log("logged out");
        $location.path('list');
      });
    };

  // This function should direct the user to the wanted page
  $scope.redirect = function(address){
    $location.hash("");
    $location.path('/' + address);
    $scope.location = $location.path();
    console.log("location = " + $scope.location);
  };

  $scope.accessLevel = function() {
    var ret = 0;
    if(!user.username){
      return ret;
    }
    if(user.assistant.length > 0){
      ret = 1;
    }
    if(user.teacher.length > 0){
      ret = 2;
    }
    if(user.isAdmin()){
      ret = 3;
    }
    return ret;
  };

  $(document).ready(function () {
    $(".navbar-nav li a").click(function(event) {
      $(".navbar-collapse").collapse('hide');
    });
  });
}]);

queueControllers.controller('adminController', ['$scope', '$location', '$http', '$modal', 'WebSocketService', 'UserService', 'TitleService',
  function ($scope, $location, $http, $modal, socket, user, title) {
    title.title = "Admin | Stay A While";
    console.log("Entered admin.html");
    $scope.name = user.username;
    $scope.selectedQueue = undefined;
    $scope.dropdown = undefined;
    $scope.admins = [];
    $http.get('/API/adminList').success(function(response){
      $scope.admins = response;
    });

    $scope.queues = [];
    $http.get('/API/queueList').success(function(response){
      var temp = response.sort(function(a, b) {return a.name.localeCompare(b.name);});
      console.log(JSON.stringify(temp));
      for (var i in temp) {
        if(user.isAdmin() || user.isTeacher(temp[i].name)){
          $http.get('/API/queue/' + temp[i].name).success(function(response){
            $scope.queues.push(response);
          });
        }
      }
    });

    socket.emit('stopListening', 'lobby');
    socket.emit('listen', 'admin');

  // Listen for an assistant being added to a queue.
  socket.on('addAssistant', function(data) {
    console.log("adding assistant (from backend) queueName = " + data.queueName + ", name = " + data.name + ", username = " + data.username);
    var queue = getQueue(data.queueName);
    if(queue){
      $scope.$apply(getQueue(data.queueName).assistant.push({name:data.name, username:data.username}));
    }
  });

  // Listen for an teacher being added to a queue.
  socket.on('removeAssistant', function(data) {
    console.log("Backend wants to remove the assistant " + data.username + " from the queue " + data.queueName);
    for (var i = $scope.queues.length - 1; i >= 0; i--) {
      if($scope.queues[i].name === data.queueName){
        for (var j = $scope.queues[i].assistant.length - 1; j >= 0; j--) {
          if($scope.queues[i].assistant[j].username === data.username){
            $scope.$apply($scope.queues[i].assistant.splice(j, 1));
            break;
          }
        }
        break;
      }
    }
  });

  // Listen for an teacher being added to a queue.
  socket.on('addAdmin', function(user) {
    $scope.$apply($scope.admins.push(user));
    console.log("adding admin (from backend) name = " + user.name + ", username = " + user.username + ", addedBy = " + user.addedBy);
  });

    // Listen for an teacher being added to a queue.
    socket.on('removeAdmin', function(username) {
      console.log("Backend wants to remove the admin " + username);
      for (var i = $scope.admins.length - 1; i >= 0; i--) {
        if($scope.admins[i].username === username){
          $scope.$apply($scope.admins.splice(i, 1));
          break;
        }
      }
    });

  // Listen for an teacher being added to a queue.
  socket.on('addTeacher', function(data) {
    console.log("adding teacher (from backend) queueName = " + data.queueName + ", name = " + data.name + ", username = " + data.username);
    var queue = getQueue(data.queueName);
    if(queue){
      $scope.$apply(getQueue(data.queueName).teacher.push({name:data.name, username:data.username}));
    }
  });

  // Listen for an teacher being added to a queue.
  socket.on('removeTeacher', function(data) {
    console.log("Backend wants to remove the teacher " + data.username + " from the queue " + data.queueName);
    for (var i = $scope.queues.length - 1; i >= 0; i--) {
      if($scope.queues[i].name === data.queueName){
        for (var j = $scope.queues[i].teacher.length - 1; j >= 0; j--) {
          if($scope.queues[i].teacher[j].username === data.username){
            $scope.$apply($scope.queues[i].teacher.splice(j, 1));
            break;
          }
        }
        break;
      }
    }
  });

  // Listen for a queue being hibernated.
  socket.on('hibernate', function(queue) {
    console.log("I will go to sleep (because backend)");
    for (var i = $scope.queues.length - 1; i >= 0; i--) {
      if(queue === $scope.queues[i].name){
        $scope.$apply($scope.queues[i].hibernating = true);
      }
    }
  });

  // Listen for a queue being unhibernated.
  socket.on('unhibernate', function(queue) {
    console.log("I will wake up (because backend)");
    for (var i = $scope.queues.length - 1; i >= 0; i--) {
      if(queue === $scope.queues[i].name){
        $scope.$apply($scope.queues[i].hibernating = false);
      }
    }
  });

  // Listen for a queue being added.
  socket.on('addQueue', function(queue) {
    console.log("Backend wants to add the queue " + queue.name);
    $scope.$apply($scope.queues.push(queue));
  });

  // Listen for the person leaving a queue event.
  socket.on('removeQueue', function(queue) {
    console.log("Backend wants to remove queue " + queue);
    for (var i = $scope.queues.length - 1; i >= 0; i--) {
      if(queue === $scope.queues[i].name){
        $scope.$apply($scope.queues.splice(i, 1));
      }
    }
  });

  function getQueue (queue) {
    for(var index in $scope.queues){
      if($scope.queues[index].name === queue){
        return $scope.queues[index];
      }
    }
  }

  $scope.addQueue = function(){
    if($scope.newQueue !== ""){
      socket.emit('addQueue', {
        queueName:$scope.newQueue
      });
      $scope.newQueue = "";
    }
  };

  $scope.removeQueue = function(){
    console.log("Called removeQueue");
    var modalInstance = $modal.open({
      templateUrl: 'warning.html',
      controller: function ($scope, $modalInstance, title, message, safeButtonText, dangerButtonText) {
        $scope.title = title;
        $scope.message = message;
        $scope.safeButtonText = safeButtonText;
        $scope.dangerButtonText = dangerButtonText;
        $scope.delete = function () {
          $modalInstance.close("delete");
        };
        $scope.doNotDelete = function () {
          $modalInstance.close("");
        };
      },
      resolve: {
        title: function () {
          return "Delete queue";
        },
        message: function () {
          return "Are you sure that you wish to remove " + $scope.selectedQueue.name + " permanently?";
        },
        safeButtonText: function () {
          return "No, I made a mistake.";
        },
        dangerButtonText: function () {
          return "Yes, I never want to see it again.";
        }
      }
    });

    modalInstance.result.then(function (message) {
      if(message === "delete"){
        socket.emit('removeQueue', {
          queueName:$scope.selectedQueue.name
        });
        console.log("Trying to delete queue " + $scope.selectedQueue.name);
        document.getElementById('dropdown').innerHTML = "Select Queue";
        $scope.selectedQueue = undefined;
      }
    }, function () {});
  };

  $scope.hibernateQueue = function(){
    console.log("Called hibernateQueue");
    var modalInstance = $modal.open({
      templateUrl: 'warning.html',
      controller: function ($scope, $modalInstance, title, message, safeButtonText, dangerButtonText) {
        $scope.title = title;
        $scope.message = message;
        $scope.safeButtonText = safeButtonText;
        $scope.dangerButtonText = dangerButtonText;
        $scope.delete = function () {
          $modalInstance.close("hibernate");
        };
        $scope.doNotDelete = function () {
          $modalInstance.close("");
        };
      },
      resolve: {
        title: function () {
          return "Hibernate queue";
        },
        message: function () {
          return "Are you sure that you wish to hibernate " + $scope.selectedQueue.name + "? This means that only admins, teachers, and assistants can enter and see the queue.";
        },
        safeButtonText: function () {
          return "No, keep it awake.";
        },
        dangerButtonText: function () {
          return "Yes, allow it some rest.";
        }
      }
    });

modalInstance.result.then(function (message) {
  if(message === "hibernate"){
    socket.emit('purge', {
      queue:$scope.selectedQueue.name
    });
    socket.emit('hibernate', {
      queue:$scope.selectedQueue.name
    });
    console.log("Trying to hibernate queue " + $scope.selectedQueue.name);
  }
}, function () {});
};

$scope.unhibernateQueue = function(){
  console.log("Called unhibernateQueue");
  var modalInstance = $modal.open({
    templateUrl: 'warning.html',
    controller: function ($scope, $modalInstance, title, message, safeButtonText, dangerButtonText) {
      $scope.title = title;
      $scope.message = message;
      $scope.safeButtonText = safeButtonText;
      $scope.dangerButtonText = dangerButtonText;
      $scope.delete = function () {
        $modalInstance.close("unhibernate");
      };
      $scope.doNotDelete = function () {
        $modalInstance.close("");
      };
    },
    resolve: {
      title: function () {
        return "Wake up queue";
      },
      message: function () {
        return "Are you sure that you wish to unhibernate " + $scope.selectedQueue.name + "? This means that anyone can see and enter the queue.";
      },
      safeButtonText: function () {
        return "No, let it sleep.";
      },
      dangerButtonText: function () {
        return "Yes, rise and shine.";
      }
    }
  });

  modalInstance.result.then(function (message) {
    if(message === "unhibernate"){
      socket.emit('unhibernate', {
        queue:$scope.selectedQueue.name
      });
      console.log("Trying to unhibernate queue " + $scope.selectedQueue.name);
    }
  }, function () {});
};

$scope.addAdmin = function(){
  if($scope.newAdmin !== ""){
    socket.emit('addAdmin', {
      username:$scope.newAdmin,
      addedBy:$scope.name
    });
    console.log("Adding admin " + $scope.newAdmin);
    $scope.newAdmin = '';
  }
};

$scope.removeAdmin = function(username){
  socket.emit('removeAdmin', {
    username:username
  });
  console.log("Removing admin " + username);
};

$scope.addTeacher = function(){
  console.log("Trying to add a new teacher by the name '" + $scope.newTeacher + "'");
  if($scope.newTeacher){
    socket.emit('addTeacher', {
      username:$scope.newTeacher,
      queueName:$scope.selectedQueue.name,
      addedBy:$scope.name
    });
    console.log("Adding teacher " + $scope.newTeacher + " in the queue " + $scope.selectedQueue.name);
    $scope.newTeacher = '';
  }
};

$scope.removeTeacher = function(username){
  socket.emit('removeTeacher', {
    username:username,
    queueName:$scope.selectedQueue.name
  });
  console.log("Removing teacher " + name + " in the queue " + $scope.selectedQueue.name);
};

$scope.addAssistant = function(){
  if($scope.newAssistant){
    socket.emit('addAssistant', {
      username:$scope.newAssistant,
      queueName:$scope.selectedQueue.name,
      addedBy:$scope.name
    });
    console.log("Adding assistant " + $scope.newAssistant  + " in the queue " + $scope.selectedQueue.name);
    $scope.newAssistant = '';
  }
};

$scope.removeAssistant = function(username){
  socket.emit('removeAssistant', {
    username:username,
    queueName:$scope.selectedQueue.name
  });
  console.log("Removing assistant " + name  + " in the queue " + $scope.selectedQueue.name);
};

$scope.selectQueue = function(queue){
  $scope.selectedQueue = queue;
  document.getElementById('dropdown').innerHTML = queue.name;
  console.log("selected queue = " + $scope.selectedQueue.name);
};

$scope.accessLevel = function() {
  var ret = 0;
  if(!user.username){
    return ret;
  }
  if(user.assistant.length > 0){
    ret = 1;
  }
  if(user.teacher.length > 0){
    ret = 2;
  }
  if(user.isAdmin()){
    ret = 3;
  }
  return ret;
};


}]);

queueControllers.controller('TitleController', ['$scope', 'TitleService',
  function ($scope, title) {
    console.log(title);
    $scope.title = title.title;

    $scope.$watch(function () { return title.title; }, function(newValue, oldValue) {
      $scope.title = newValue;
    });
  }]);