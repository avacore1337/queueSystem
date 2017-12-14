/* jslint node: true */
"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//-----

// Schema used for users in the queues
var userSchema = new Schema({
  username: String,
  ugKthid: String,
  realname: String,
  location: String,
  startTime: { type: Number, default: Date.now },
  receivingHelp: { type: Boolean, default: false },
  help: Boolean,
  comment: { type: String, default: '' },
  badLocation: { type: Boolean, default: false }
});

// creates a JSON-object from the schema
userSchema.methods.toJSON = function () {
  return {
    realname: this.realname,
    username: this.username,
    ugKthid: this.ugKthid,
    location: this.location,
    time: this.startTime,
    receivingHelp: this.receivingHelp,
    help: this.help,
    comment: this.comment,
    badLocation: this.badLocation
  };
};

var User = mongoose.model("User", userSchema);
module.exports = User;
