// När man anropar många functioner så ska man skicka med en callback, en funktion som ska anropas när koden har kört klart.
// t.ex.

Statistic.find({this is the objcet that sais what to find}, function (theDataTheFunctionsGives){
	//Do something with the data that was requested
})

// Att skicka in data till funktioner är något man gör istället för att använda return!
// anledningen till att man gör detta är att man ska kunna starta igång måñga oberoende uppgifter.
// Det är ett alternativ till multi-trådning

// nu ska vi skriva vår egen method som tar ett callback

statisticSchema.statics.getPeopleWhoEnteredQueueWithinTimeperiod =  function (course, start, end, theCallback){
	// count tar precis som find två parametrar, 
	Statistic.count(
		// 1. ett objekt som säger vad som ska hittas
		{
			name: course, 
			leftQueue: false, 
			time: {"$gte": start, "$lt": end}
		},
		// två en funktion som säger vad som ska göras med datan
		function (err, amount) { // funktionen till count ska ta två parametrar, err som säger om det gick bra eller inte och amount som är svaret
	  		if (err) return console.error(err); //lite felhantering bara
	  			console.log("peopleHelped:", amount)
	  		else{
		    	theCallback(amount); //anropa funktionen som skickades med som parameter med datan
	  		}
		}
	)
}

Statistic.getPeopleWhoEnteredQueueWithinTimeperiod("dbas",new Date(), new Date(),function (amount) {
	console.log(amount);
});

// Det är viktigt att funktionen som anropas (theCallback) tar lika många parametrar som skickas in. i det här fallet bara amount
