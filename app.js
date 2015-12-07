var shelljs = require('shelljs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser'),
    cors = require('cors');
var bluebird = require('bluebird');
app.use(express.static('public'));
//var rimraf = bluebird.promisifyAll(require('rimraf'));
var rimraf = require('rimraf');
var path = require('path');
var _util = require('./lib/util');
var multer = require('multer');
var upload = multer({ dest: __dirname + '/uploads/' });
var fs = require('fs');
var unzip = require('unzip');
var config = require('./config');

app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.post('/deploy_zip', upload.single('zipFile'), function (req, res, next) {
  shelljs.cd(__dirname);
  console.log( req.body );
  var apiFolder = req.body.apiFolder || ".";
  var makeScript = req.body.makeScript || "make.sh";
  var org = req.body.org || "";
  var env = req.body.env || "";
  if( !org || !env){
    throw("Missing org or env parameters.");
  }
  res.write('apiFolder: ' + apiFolder + '\n');
  res.write('makeScript: ' + makeScript + '\n');
  res.write('org: ' + org + '\n');
  res.write('env: ' + env + '\n');
  var userName = req.body.userName;
  var pw = req.body.pw;
  var UUID = _util.sessionToken();
  res.write('UUID: ' + UUID + '\n');
  var nodeBasePathBuild = path.join('./public/builds/', UUID); //node.js app is based on /public
  var loginAppBasePathBuild = path.join('/builds/', UUID); //login app is based on /public/.
  var appBasePath = process.cwd();
  var pathToDirections = 'directions.html' || req.body.pathToDirections; //directions.html
  var stream = fs.createReadStream(req.file.path).pipe(unzip.Extract({ path: nodeBasePathBuild }));
  stream.on('close', function() {
    shelljs.cd(nodeBasePathBuild + "/" + apiFolder);
    var execStr = ' ae_username=' + userName + ' ae_password=' + pw + ' env=' + env //space in front of ae_username to run command in bash without save in history
        + ' org=' + org + ' sh -c \'sh ' + makeScript + '\'';
    res.write("============= Initiating Build ===============\n");
    console.log(execStr);
    var output = shelljs.exec( execStr, { async: true});
    output.stdout.on('data', function(data) {
      res.write(data);
    });
    output.stdout.on('end', function(code) {
      res.write('============== Deployment Completed ===============\n');
      setTimeout( _util.removeClonedRepo, config.remove_cloned_repo_timeout, appBasePath, nodeBasePathBuild);
      res.end();
    });
    output.stderr.on('data', function(code) {
      res.write(code);
    });

  });
});

app.post('/deploy', function (req, res) {
    shelljs.cd(__dirname);
    var repo = req.body.repo;
    var apiFolder = req.body.apiFolder || ".";
    var makeScript = req.body.makeScript || "make.sh";
    var org = req.body.org || "";
    var env = req.body.env || "";
    if( !repo ) throw("Missing repo.");
    if( !org || !env){
      throw("Missing org or env parameters.");
    }
    res.write('repo: ' + repo + '\n');
    res.write('apiFolder: ' + apiFolder + '\n');
    res.write('makeScript: ' + makeScript + '\n');
    res.write('org: ' + org + '\n');
    res.write('env: ' + env + '\n');
    var userName = req.body.userName;
    var pw = req.body.pw;
    var UUID = _util.sessionToken();
    res.write('UUID: ' + UUID + '\n');
    var nodeBasePathBuild = path.join('./public/builds/', UUID); //node.js app is based on /public
    var loginAppBasePathBuild = path.join('/builds/', UUID); //login app is based on /public/.
    var appBasePath = process.cwd();
    // var nodeBasePathBuild = path.join('./public/builds/', _util.sessionToken(), org + '-' + env);
    var pathToDirections = 'directions.html' || req.body.pathToDirections; //directions.html
    shelljs.exec("git clone " + repo + " " + nodeBasePathBuild, function(code, output) {
      console.log("Exit:", code);
      res.write("Exit: " + code + "\n");
      console.log('Program output:', output);
      res.write("Program output: " + output + "\n");
      shelljs.cd(nodeBasePathBuild + "/" + apiFolder);
      //res.write("cd into Github apiFolder folder: " + execOutput);
      var execStr = ' ae_username=' + userName + ' ae_password=' + pw + ' env=' + env //space in front of ae_username to run command in bash without save in history
        + ' org=' + org + ' sh -c \'sh ' + makeScript + '\'';
      res.write("============= Initiating Build ===============\n");
      var output = shelljs.exec( execStr, { async: true});
      output.stdout.on('data', function(data) {
        res.write(data);
      });
      output.stdout.on('end', function(code) {
        res.write('============== Deployment Completed ===============\n');
        setTimeout( _util.removeClonedRepo, config.remove_cloned_repo_timeout, appBasePath, nodeBasePathBuild);
        res.end();
      });
      output.stderr.on('data', function(code) {
        res.write(code);
      });
    });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});