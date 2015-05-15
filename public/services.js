angular.module('queue')

.factory('UserService', function() {

  var admin = false;

  var teacher = [];

  var assistant = [];

  var username = "";
  return {

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
      console.log("username: " + username);
      var ret = 0;
      if(!username){
        return 0;
      }
      if(assistant.length > 0){
        ret = 1;
      }
      if(teacher.length > 0){
        ret = 2;
      }
      if(admin){
        ret = 3;
      }
      return ret;
    },

    /**
     * Function decorator.
     * Requires the user to be admin to run the functions.
     */
    //admin: function (func) {
    //  return function () {
    //    if (admin) {
    //      return func.apply(this, arguments);
    //    }
    //  };
    //},

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