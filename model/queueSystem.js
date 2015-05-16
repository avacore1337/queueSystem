


var database = require("./model.js"); // databas stuff

var User = database.user;
var Admin = database.admin;
var Course = database.course;
var Statistic = database.statistic;


var courseList = [];
var adminList = [];
var statisticsList = [];

function setup() {
  // list of courses to be used
  var tmpList = [
    "dbas",
    "inda",
    "logik",
    "numme",
    "mvk",
    "progp",
    "mdi",
  ];

  // creates database-objects from the list (of courses)
  for (var i = 0; i < tmpList.length; i++) {
    var course = tmpList[i];
    var newCourse = new Course({
      name: course
    });
    courseList.push(newCourse);
    newCourse.save();

    //---------------------------------------------------------------------------------------
    /*TEST*/
    var randomTime = Date.now() - Math.random() * 3 * 1000000;
    //---------------------------------------------------------------------------------------
    // for every course, create users
    var queues = Math.floor((Math.random() * 50) + 1);
    for (var j = 0; j < queues; j++) {
      var newUser = new User({
        name: Math.random().toString(36).substring(7),
        place: 'Green',
        comment: 'lab1',
        startTime: randomTime
      });
      newCourse.addUser(newUser);
      newCourse.save();
      var newStatistic = new Statistic({
        name: newUser.name,
        course: newCourse.name,
        startTime: newUser.startTime,
        action: ''
      });
      statisticsList.push(newStatistic);
      newStatistic.save();

      //---------------------------------------------------------------------------------------
      /*TEST*/
      randomTime += Math.random() * 5 * 10000;
      //---------------------------------------------------------------------------------------
    }

    console.log(course + " " + newCourse.queue.length); // temporary for error-solving
  }

  var newAdmin = new Admin({
    name: "pernyb",
    username: "pernyb"
  });
  adminList.push(newAdmin);
  newAdmin.save();

  newAdmin = new Admin({
    name: "antbac",
    username: "antbac"
  });
  adminList.push(newAdmin);
  newAdmin.save();

  newAdmin = new Admin({
    name: "rwb",
    username: "rwb"
  });
  adminList.push(newAdmin);
  newAdmin.save();
}

// Read in courses and admins from the database
function readIn() {
  // All the courses
  Course.find(function(err, courses) {
    courses.forEach(function(course) {
      courseList.push(course);

      console.log('Course: ' + course.name + ' loaded!'); // temporary for error-solving
    });
  });
}


setup(); // temporary method
//readIn();


module.exports = {
  courseList: courseList,
  adminList: adminList,
  statisticsList: statisticsList
};