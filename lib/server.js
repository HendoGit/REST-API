/*
 * Server related tasks
 */

//Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// Instantiate the server module object
var server = {};

// String decoder library contains number of useful things - we just want those within StringDecoder part of the object
//The server should respond to all requests with a string

//Instantiate the HTTP Server
server.httpServer = http.createServer(function(req, res){
    server.unifiedServer(req, res);
    
});

// Instantiate the HTTPS Server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res){
    server.unifiedServer(req, res);
    
});



server.unifiedServer = function(req, res){

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
       var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound

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



           // If the response is 200, print green, otherwise print red
           if(statusCode == 200){
                debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
           } else {
                debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
           }
       });

   });
}



// Define a request router
server.router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};

// Init script
server.init = function(){
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, function(){
        console.log('\x1b[35m%s\x1b[0m', "The server is listening on port "+config.httpPort);
    });

    // Start the HTTPS server
    // Start the HTTPS Server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log('\x1b[36m%s\x1b[0m', "The server is listening on port "+config.httpsPort);
        
    });
};



// Export the module
module.exports = server;