const connect = require('connect');
const serveStatic = require('serve-static');
const colors = require('colors');
const WebSocketServer = require('websocket').server;
const _ = require('underscore');
const cookie = require('cookie');
const url = require('url');

var staticDir = '.',
	port = 3250,
	app = connect(),
	users = {},
	log = [],
	pullConnects = [];

app
.use(serveStatic(staticDir))
.use(function(req,res) {

	var c = req.headers.cookie || '';
	var param = cookie.parse(c);

	var urlParts = url.parse(req.url, true);
	var query = urlParts.query;

	console.log(param.sid, issetSid(param.sid));

	if(/^\/j_stat/.test(req.url)) {		
		
		if(param.sid && issetSid(param.sid)) {
			res.end('{"stat": 1, "login": "' + getUserBySid(param.sid).login + '"}');
		} else {
			res.end('{"stat": 0}');
		}

		
	} else if(/^\/j_create/.test(req.url)) {

		if(req.method !== 'GET') {
			res.end('{"stat": 0, "err": "allow only GET method"}');
			return;
		}

		var login = query.login || '';
		login = login.trim();
		if(login.length) {
			var user = getUser(login);

			if(user) {
				res.end('{"stat": 0, "err": "login is already in use"}');
				return;
			}

			if(getUserBySid(param.sid)) {
				res.end('{"stat": 0, "err": "pls logout before login"}');
				return;
			}

			var sid = generateGuid();

			users[sid] = {login: login, date: (new Date()).getTime()}

			res.setHeader("Set-Cookie", ['sid='+sid]);
			
			res.end('{"stat": 1, "sid": "'+ sid +'"}');
		} else {
			res.end('{"stat": 0, "err": "empty login param"}');
		}
	} else if(/^\/j_log/.test(req.url)) {
		if(param.sid && issetSid(param.sid)) {
			res.end(JSON.stringify(log));
		} else {
			res.end('{"stat": 0}');
		}
		
		return;
	} else if(/^\/j_online/.test(req.url)) {

		if(param.sid && issetSid(param.sid)) {
			var online = _.map(pullConnects, function(el,n) {
				return el.user;
			});

			online = _.uniq(online);

			res.end(JSON.stringify({stat: 1, online: online}));
		} else {
			res.end('{"stat": 0}');
		}

	} else {
		res.end('{"stat": 0, "err": "not allowed"}');
	}

});


// I am so sorry for this func
process.on('uncaughtException', function(err) {
  console.log(err);
  process.exit(0);
}); 

var server = app.listen(port);

server.on('error', function() {
  console.log("Error connection".red.bold);
}); 

wsServer = new WebSocketServer({
    httpServer: server, 
    autoAcceptConnections: false
});

wsServer.on('request', function(request) {
	// console.log(request);
	
	try {

		var sid = '';

		_.each(request.cookies, function(c,n) {
			if(c.name == 'sid') sid = c.value;
		});

		var user = getUserBySid(sid);

		if(user) {
			var connection = request.accept('hello', request.origin);
			var guid = generateGuid();
			connection.guid = guid;
			pullConnects.push({user: user.login, conn: connection, guid: guid });

			console.log('Add connect', pullConnects.length);
			console.log('Conected: ' +  guid);
		} else {
			console.log('Can bot get user'.red.bold);
			// не залогиненый нигер пытается создать сокет, не принимаем его
			return;
		}

			
	} catch(e) {
		console.log(e.message.red.bold);
		return;
	}
	
	console.log(request.host + ' Connection accepted'.bgGreen.white.bold);

	connection.on('message', function(message) {
		if (message.type === 'utf8') {

			var user = users[sid];

			if(user) {
				var login = user.login;

				var data = JSON.parse(message.utf8Data);

				console.log(data);

				if(data) {
					// чистим лог чата;
					if(log.length > 100) log = [];
				
					log.push({login: login, time: (new Date()).getTime(), msg: data.msg});

					var pack = JSON.stringify({body: {msg: data.msg, login: login}, onlineUpdate: false});

					console.log('has', this.guid);
	
            		brodcast(pack, this.guid);
				}

			} else {
				console.log('wrong sid');
				// this.sendUTF('Error. Wromg sid');
				// wsServer.close(this);

			}

			
        }
	});

	connection.on('error', function(err) {
		console.log('Errorr'.red.bold, err);
	});

	connection.on('close', function(reasonCode, description) {
        console.log((new Date()).getTime() + ' Peer ' + this.guid + ' disconnected.', description);
        dsconnUser(this.guid);
    });
});

function brodcast(msg, self) {
	_.each(pullConnects, function(user, n) {
		// себе не шлем;
		if(user.guid != self) user.conn.sendUTF(msg);
	});
}

function dsconnUser(guid) {
	_.each(pullConnects, function(user, n) {
		try {
			if(user.conn.guid == guid) {
			 pullConnects.splice(n,1);

			console.log('Remove connect', pullConnects.length);
			return false;
			}
		} catch(e) {
			console.log(e.message);
		}
	});
}

function issetSid(sid) {
	return !!users[sid];
}

function getUser(login) {
	var u = false;
	_.each(users, function(user, n) {
		if(user.login == login) {
			u = user;
			return false;
		}
	});

	return u;
}

function getUserBySid(sid) {
	return users[sid] || '';
}

function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r, v;
      r = Math.random() * 16 | 0;
      v = c === 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
}

console.log(("Server is listening at port: "+port).bgGreen.white.bold);