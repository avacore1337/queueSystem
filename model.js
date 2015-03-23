var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');
var async = require('async');

var util = require('./util.js');
var fluent = util.fluent;
var saving = util.saving;


var adminSchema = new Schema(({
	name: String,
	addedBy: String,
}))


/**
 * checks if the user is a superadmin
 * @param {WebSocket} socket
 */
adminSchema.statics.isSuperAdmin = fluent(saving(function (user, cb) {
	Admin.find({user: user}, cb)
}));


var statisticSchema = new Schema({
	name: String,
	time: { type: Number, default: Date.now },
	action: String,
	leftQueue: { type: Boolean, default: false },
	queueLength: { type: Number, default: 0}
});

statisticSchema.index({time: 1});


var userSchema = new Schema({
	name: String,
	time: { type: Number, default: Date.now },
	action: String,
	comment: { type: String, default: '' }
});


userSchema.methods.toJSON = function () {
	return {
		name: this.name,
		time: this.time,
		action: this.action,
		comment: this.comment
	};
};

var courseSchema = new Schema({
	name: String,
	open: { type: Boolean, default: true },
	active: { type: Boolean, default: true },
	queue: [userSchema],
	admin: {type:[adminSchema], default: []}
});


courseSchema.methods.addAdmin = fluent(saving(function (user, newAdmin) {
	thisCourse = this.course;

}));

courseSchema.methods.addUser = fluent(saving(function (user) {
	var qLength = this.queue.length;
	this.queue.push(user);
	var stat = new Statistic({
		name: this.name, 
		time: Date.now(), 
		action: user.action, 
		leftQueue: false,
		queueLength: qLength});
	stat.save();
}));

courseSchema.methods.removeUser = fluent(saving(function (username) {
	var qLength = this.queue.length;
	//getStatistics(this.name, Date.now()-30000, Date.now())
	var courseName = this.name;
	this.queue = this.queue.filter(function (user) {
		if (user.name === username) {
			var stat = new Statistic({
				name: courseName, 
				time: Date.now(), 
				action: user.action, 
				leftQueue: true,
				queueLength: qLength});
			stat.save();
		};
		return user.name !== username;
	});
}));

courseSchema.methods.forUser = fluent(saving(function (fn) {
	this.queue.forEach(fn);
}));

courseSchema.methods.updateUser = fluent(saving(function (name, user) {
	this.queue.forEach(function (usr, i, queue) {
		if (usr.name === name) {
			_.extend(queue[i], user);
		}
	});
}));

courseSchema.statics.isAdmin = fluent(saving(function (courseName, user, cb) {
	Course.find({course: courseName, "admin.name": user}, cb);
}));

var User = mongoose.model("User", userSchema);

var Course = mongoose.model("Course", courseSchema);

var Admin = mongoose.model("Admin", adminSchema);

var Statistic = mongoose.model("Statistic", statisticSchema);


statisticSchema.statics.getStatistics =  function (course, start, end, callbackDo){
	async.parallel([

	function(callback){
		Statistic.count({
			name: course, 
			leftQueue: false, 
			action:"H", 
			time: {"$gte": start, "$lt": end}},
			function (err, amount) {
		  	if (err) return console.error(err);
		  	console.log("peopleHelped:", amount)
        callback(null, amount);
		})
	},

	function(callback){
		Statistic.count({
			name: course, 
			leftQueue: false, 
			action:"P", 
			time: {"$gte": start, "$lt": end}},
			function (err, amount) {
			  if (err) return console.error(err);
		  	console.log("peoplePresented:", amount)
        callback(null, amount);
		})
	},

  function(callback){
    Statistic.count({name: course, 
    	leftQueue: false, 
    	time: {"$gte": start, "$lt": end}},
  	function (err, amount) {
      callback(null, amount);
    });
	},
  function(callback){
    Statistic.count({name: course, 
    	leftQueue: true, 
    	time: {"$gte": start, "$lt": end}},
  	function (err, amount) {
      callback(null, amount);
    });
	}],

	function(err, results){
		console.log("res data",results)
		callbackDo(null, {peopleHelped: results[0], peoplePresented: results[1], leftInQueue: (results[2] - results[3])});
	});

}



module.exports = {
	User: User,
	Course: Course,
	Statistic: Statistic
};


