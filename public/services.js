angular.module('queue')

.factory('UserService', function () {

	return {
		admin: false,

		username: "",

		setName: function (name) {
			this.username = name;
		},

		getName: function () {
			return this.username;
		},

		isAdmin: function () {
			return this.admin;
		},

		setAdmin: function (bool) {
			this.admin = bool;
		},

		/**
		 * Function decorator.
		 * Requires the user to be admin to run the functions.
		 */
		//admin: function (func) {
		//	return function () {
		//		if (admin) {
		//			return func.apply(this, arguments);
		//		}
		//	};
		//},

		clearName: function () {
			this.username = void 0;
		}
	};
})

.factory('WebSocketService', function () {

	var ws = io.connect();

	return ws;
})

.factory('TitleService', function () {

	return {
		title: "Stay A While"
	};
});

