/*

Primary file for the API

*/

//Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var fs = require('fs');
var _data = require('./lib/data');
var handlers = require('./lib/handlers')
var helpers = require('./lib/helpers')





// String decoder library contains number of useful things - we just want those within StringDecoder part of the object

//The server should respond to all requests with a string

//Instantiate the HTTP Server
var httpServer = http.createServer(function(req, res){
    unifiedServer(req, res);
    
});

// Start the server
httpServer.listen(config.httpPort, function(){
    console.log("The server is listening on port "+config.httpPort);
});

// Instantiate the HTTPS Server
var httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions, function(req, res){
    unifiedServer(req, res);
    
});

// Start the HTTPS Server
httpsServer.listen(config.httpsPort, function(){
    console.log("The server is listening on port "+config.httpsPort);
});

//All the server logic for both the http and https server
var unifiedServer = function(req, res){

   //Get the URL and parse it
   var parsedUrl = url.parse(req.url, true);

   // Get the path
   var path = parsedUrl.pathname;
   var trimmedPath = path.replace(/^\/+|\/+$/g, '');

   // Get the query string as an object
   var queryStringObject = parsedUrl.query;

   // Get the HTTP Method
   var method = req.method.toLowerCase();

   // Get the headers as an object
   var headers = req.headers;

   // Get the payload, if any
   var decoder = new StringDecoder('utf-8');

   // Payloads come to the http server as a stream, so we need to collect the stream as it comes in, and coalesce that into one thing
   // once that stream comes to an end
   var buffer = '';
   req.on('data', function(data){
       buffer += decoder.write(data);
   });
   req.on('end', function(){
       buffer += decoder.end();

       // Choose the handler this request should go to. If one is not found use the not found handler
       var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

       // Construct the data object to send to the handler
       var data = {
           'trimmedPath'       : trimmedPath,
           'queryStringObject' : queryStringObject,
           'method'            : method,
           'headers'           : headers,
           'payload'           : helpers.parseJsonToObject(buffer)
       }

       // Route the request to the handler specified in the router
       chosenHandler(data, function(statusCode, payload){
           // Use the status code called back by the handler, or default to 200
           statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

           // Use the payload called back by the handler, or default to an empty object
           payload = typeof(payload) == 'object' ? payload : {};

           // We can't send an object back to the user - we have to send back a string
           // Convert the payload to a string
           var payloadString = JSON.stringify(payload);

           // Return the response
           res.setHeader('Content-Type', 'application/json')
           res.writeHead(statusCode);
           res.end(payloadString);



           // Returning this response
           console.log('Returning this response: ',statusCode, payloadString);
       });

       

   });

}



// Define a request router
var router = {
    'ping' : handlers.ping,
    'users' : handlers.users
}