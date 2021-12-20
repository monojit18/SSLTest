/*jshint esversion: 8 */

const Express = require('express');
const Path = require("path");
const Http = require("http");
const Https = require("https");
const FS = require("fs");
const DotEnv = require("dotenv");
const Cosmos = require("@azure/cosmos");

const _express = Express();
_express.use(Express.urlencoded({extended:false}));
_express.use(Express.json());

const _httpServer = Http.createServer(_express);
DotEnv.config();

const baseFolderPath = Path.resolve(__dirname);
var privateKey = FS.readFileSync(baseFolderPath + process.env.KEY_FILENAME).toString();
var certificate = FS.readFileSync(baseFolderPath + process.env.CERT_FILENAME);

var tlsCreds = {key: privateKey, cert: certificate};
const _httpsServer = Https.createServer(tlsCreds, _express);

// const options =
// {

//     pfx: certificate,
//     passphrase: "<pwd>"

// };
// const _httpsServer = Https.createServer(options, _express);

const cosmosEndpoint = process.env["COSMOSDB_ENDPOINT"];
const cosmosKey = process.env["COSMOSDB_KEY"];

const cosmosClient = new Cosmos.CosmosClient({

    endpoint: cosmosEndpoint,
    key: cosmosKey

});

const db = cosmosClient.database("bkenddb");
const container = db.container("bkendcnt");

_express.get('/bkend/:id', (req, res) =>
{
        
    const id = req.params.id;
    const pkey = parseInt(req.query.pk);
    container.item(id, pkey).read().then((itemResponse) =>
    {

        if (itemResponse.statusCode >= 400)
            throw (new Error(itemResponse.statusCode.toString()));

        console.log(itemResponse.resource);
        res.send(itemResponse.resource);

    }).catch(ex =>
    {

        console.log(ex);
        
        const errorCode = parseInt(ex.message);
        res.statusCode = (errorCode === NaN) ? 500 : errorCode;
        res.send(ex);

    }); 
});

_express.post('/bkend/add', (req, res) =>
{    
    
    let body = req.body;
    container.items.create(body).then((itemResponse) =>
    {
        
        console.log(itemResponse.statusCode);
        res.statusCode = itemResponse.statusCode;
        res.send({});

    }).catch(ex =>
    {
        
        console.log(ex);
        const errorCode = parseInt(ex.message);
        res.statusCode = (errorCode === NaN) ? 500 : errorCode;
        res.send(ex);
    });
});

_express.delete('/bkend/delete/:id', (req, res) =>
{    

    const id = req.params.id;
    const pkey = parseInt(req.query.pk);
    let cosmosItem = (isNaN(pkey) ? container.item(id) : container.item(id, pkey));
    cosmosItem.delete().then((deleteResponse) =>
    {        
        
        console.log(deleteResponse.statusCode);
        res.statusCode = deleteResponse.statusCode;
        res.send({});
    }).catch(ex =>
    {        
        
        console.log(ex);        
        res.send(ex);
    });
});

let httpPort = process.env.PORT || 9081;
let httpsPort = process.env.PORT || 9443;
let host = "0.0.0.0";
_httpServer.listen(httpPort, host, function ()
{

    console.log(`Docker container started the server on http ${_httpServer.address().port}\n`);

});

_httpsServer.listen(httpsPort, host, function ()
{

    console.log(`Docker container started the server on https ${_httpsServer.address().port}\n`);

});

_httpServer.on("close", function ()
{

    console.log("We are Closing ç\n");    


});

_httpsServer.on("close", function ()
{

    console.log("We are Closing Https\n");    


});

process.on("SIGINT", function()
{
    _httpServer.close();
    _httpsServer.close();

});
