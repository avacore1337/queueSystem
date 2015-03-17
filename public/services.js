angular.module('queue')

.factory('UserService', function () {
	var username = "";
	var admin = false;

	return {
		setName: function (name) {
			username = name;
		},

		getName: function () {
			return username;
		},

		isAdmin: function () {
			return admin;
		},

		setAdmin: function (bool) {
			admin = bool;
		},

		/**
		 * Function decorator.
		 * Requires the user to be admin to run the functions.
		 */
		admin: function (func) {
			return function () {
				if (admin) {
					return func.apply(this, arguments);
				}
			};
		},

		clearName: function () {
			username = void 0;
		}
	}
})

.factory('WebSocketService', function () {

	var ws = io.connect();

	return ws;
});

