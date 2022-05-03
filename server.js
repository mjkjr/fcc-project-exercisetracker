require('dotenv').config();

const express = require('express');
const app = express();

// cross-origin resource sharing
const cors = require('cors');
app.use(cors());

// for parsing POST data
const bodyParser = require('body-parser');

// database
const mongoose = require( 'mongoose' );
const { Schema } = mongoose;

// define the data schema
const exerciseSchema = new Schema({

	username: String,
	log: [ {

		description: String,
		duration: Number,
		date: String
	} ]
});

// create a model from the schema
const exerciseModel = mongoose.model( 'exercise', exerciseSchema );

// connect to the database
mongoose.connect( process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true } );


// serve static files from public/
app.use( express.static( 'public' ) );

// serve main html page
app.get( '/', (req, res) => { res.sendFile(__dirname + '/views/index.html'); });


// middleware to parse post body for the given route
app.use( '/api/users', bodyParser.urlencoded( { extended: false } ) );

// parses a request to shorten a given URL and returns the result
app.post( '/api/users', ( request, response ) => {

	// search the database for an existing user by the same name
	exerciseModel.find( { username: request.body.username }, ( err, results ) => {
		
		// username already exists
		/* error checking removed to pass freeCodeCamp tests
		if ( results.length > 0 ) {
			
			response.json( { error: 'Username already exists!' } );
		}
		else */{
			
			// save the new username in the database
			const exerciseDocument = new exerciseModel( { username: request.body.username } );

			exerciseDocument.save( ( err, data ) => {
				
				// return the username & _id in a json object        
				response.json( { username: data.username, _id: data._id } );
			});
		}
	});
});


// returns an array of the usernames from the database
app.get( '/api/users', ( request, response ) => {

	exerciseModel.find( {} ).select( { username: 1 }).exec( ( err, data ) => {

		response.json( data );
	});
});


// middleware to parse post body for the given route
app.use( '/api/users/:id/exercises', bodyParser.urlencoded( { extended: false } ) );

// add exercise info to database
app.post( '/api/users/:id/exercises', ( request, response ) => {

	// format the exercise log data
	const formattedDate = (new Date( request.body.date || Date.now() ) ).toDateString();

	const entry = {

		description: request.body.description,
		duration: request.body.duration,
		date: formattedDate
	};

	// find and update the appropriate record
	exerciseModel.findOneAndUpdate( { _id: request.params.id }, { $push: { log: entry } }, { new: true }, ( err, data ) => {
		
		// return the added data
		response.json( { _id:request.params.id, username:data.username, date:entry.date, duration:Number( entry.duration ), description:entry.description } );
	});
});


// return the exercise log of a given user
app.get( '/api/users/:id/logs', ( request, response ) => {

	// find the user record in the database by id
	exerciseModel.find( { _id: request.params.id }, ( err, results ) => {

		// convert results to mutable js object
		let record = JSON.parse( JSON.stringify( results[0] ) );

		// add count property to results
		record.count = record.log.length;

		// filter results by date if specified
		if ( request.query.from ) {

			record.log = record.log.filter( (entry) =>  new Date( entry.date ) >= new Date( request.query.from ) );
		}
		if ( request.query.to ) {

			record.log = record.log.filter( (entry) => new Date( entry.date ) <= new Date( request.query.to ) );
		}

		// limit results if applicable
		if ( request.query.limit && request.query.limit > 0 ) {

			record.log.splice( request.query.limit );
		}

		// remove _id fields from the log array
		record.log.forEach( ( entry ) => {

			delete entry._id;
		});

		// return the record
		response.json( record );
	});
});


// listen
const listener = app.listen(process.env.PORT || 3000, () => {
	console.	log( 'Listening on port: ' + listener.address().port );
});
