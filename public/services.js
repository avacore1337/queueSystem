angular.module('queue')

.factory('UserService', function() {

  return {
    admin: false,

    teacher: [],

    assistant: [],

    username: "",

    setName: function(name) {
      this.username = name;
    },

    getName: function() {
      return this.username;
    },

    isAdmin: function() {
      return this.admin;
    },

    setAdmin: function(bool) {
      this.admin = bool;
    },

    isTeacher: function(course) {
      return $.inArray(course, this.teacher) !== -1;
    },

    setTeacher: function(list) {
      this.teacher = list;
    },

    isAssistant: function(course) {
      return $.inArray(course, this.assistant) !== -1;
    },

    setAssistant: function(list) {
      this.assistant = list;
    },

    accessLevel: function() {
      console.log("username: " + this.username);
      var ret = 0;
      if(!this.username){
        return 0;
      }
      if(this.assistant.length > 0){
        ret = 1;
      }
      if(this.teacher.length > 0){
        ret = 2;
      }
      if(this.admin){
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
      this.username = void 0;
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