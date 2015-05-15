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

    return {
      updateUserData: updateUserData,

      setName: function(name) {
        username = name;
      },

      getName: function() {
        return username;
      },

      isAdmin: function() {
        return admin;
      },

      setAdmin: function(bool) {
        admin = bool;
      },

      isTeacher: function(course) {
        return $.inArray(course, teacher) !== -1;
      },

      setTeacher: function(list) {
        teacher = list;
      },

      isAssistant: function(course) {
        return $.inArray(course, assistant) !== -1;
      },

      setAssistant: function(list) {
        assistant = list;
      },

      accessLevel: function() {
        var ret = 0;
        if (!username) {
          return 0;
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

      clearName: function() {
        username = void 0;
      }
    };
  })

  .factory('WebSocketService', function() {

    var ws = io.connect();

    return ws;
  })

  .factory('TitleService', function() {

    return {
      title: "Stay A While"
    };
  });
})();