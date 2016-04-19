'use strict';

//Weather app
//See https://wit.ai/l5t/Quickstart

const Wit = require('node-wit').Wit;
var request = require('request');
var optionsGeo = {baseUrl: 'https://maps.googleapis.com',
                url: '/maps/api/geocode/json',
                method: 'GET',
                qs: {key: 'AIzaSyAA1wgdEQqqeC-Zd5kyLUeVITMWJBrnVUE'}};
var optionsForecast = {baseUrl: 'https://api.forecast.io/forecast/6910003c0694289728c13fac4211e793',
                url: '',
                method: 'GET'};
const token = 'XXBV2UU4TVXFQATPPME3BAM4TOFRUNS3';

const firstEntityValue = (entities, entity) => {
    const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
    ;
    if (!val) {
        return null;
    }
    return typeof val === 'object' ? val.value : val;
};
//a function that calculates the difference in days between two dates
var dayDiff = function (time, now) {
    return (    Date.UTC(time.getFullYear(), time.getMonth(), time.getDate()) -
                Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
}
//parse the weather, add it to context, and call the callback
var parseWeather = function(context, callback, time, error, message, body) {
    //check for errors in the request
    if (error) {
        context.forecast = "bad API call";
        callback(context);
    } else {
        //parse the weather response
        var weather = JSON.parse(body);
        //calculate the difference in days to get a forecast
        var dayDifference = dayDiff(time, new Date(Date.now()));
        //error bounds checking (this has some issues late at night)
        if (dayDifference > 7) {
            context.weather = "We don't have that data yet!";
        } else if (dayDifference < 0) {
            context.weather = "That's in the past!";
        } else {
            //return the date
            context.weather = weather.daily.data[dayDifference].summary;
        }
        //callback with the context
        callback(context);
    }
}
//get the weather for a specific time
var getWeather = function (context, callback, time, error, message, body) {
    //check for errors
    if (error) {
        console.log("1")
        context.forecast = "bad API call";
        callback(context);
    } else {
        //parse the Google response
        var locate = JSON.parse(body);
        //get the geocode out of the JSON
        var geocode = locate.results[0].geometry.location;
        //send request to forecast.io
        optionsForecast.url = geocode.lat + "," + geocode.lng;
        request(optionsForecast, parseWeather.bind(this, context, callback, time));
    }
}

//get the weather for a specific date
var getTime = function (context, callback, time) {
    optionsGeo.qs.address = context.place;
    //use the google maps API to turn an address into geocode
    request(optionsGeo, getWeather.bind(this, context, callback, time));
}
//get the weather for now
var getNow = function (context, callback) {
    getTime(context, callback, new Date(Date.now()));
}

const actions = {
        say: (sessionId, msg, cb) => {
            console.log(msg);
            cb();
        },
        merge: (context, entities, cb) => {
            // Retrieve the location entity and store it into a context field
            const place = firstEntityValue(entities, 'location');
            const time = firstEntityValue(entities, 'datetime');
            if (place) {
                context.place = place;
            }
            if (time) {
                context.time = new Date(time);
            }
            cb(context);
        },
        error: (sessionId, msg) => {
            console.log('Oops, I don\'t know what to do.');
        },
        'getForecast': (context, cb) => {
            //get the weather for a time in the future
            getTime(context, cb, context.time);
        },
        'getWeather': (context, cb) => {
            //get the weather for now
            getNow(context, cb);
        },
        'clear' : (context, cb) => {
            cb({});
        }
    };

const client = new Wit(token, actions);
client.interactive();


