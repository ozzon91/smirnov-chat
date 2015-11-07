!function() {
	'use strict';

	var loginGlob;

	var wrapper = $('.wrapper');
	var loginWrapper = $('.login-wrapper')
	var list = $('.list-msg').empty();

	loginStat().then(function(stat) {
		if(stat.stat) {
			initChat(stat.login);
		} else {
			initLogin();
		}
	});

	// ---

	$('#enter').on('click', function() {
		var login = $('input[name=login]').val().trim();

		if( /[a-zA-z0-9_]/i.test(login) ) {
			
			enter(login).then(function(res) {

				loginGlob = login;

				if(res.stat) {
					initChat(login);
				} else {
					alert(res.err);
				}

			});

		} else {
			alert('Empty login or contain not allowed symbols');
			return;
		}
	});


	$('#send').on('click', sent);

	$('#my-msg').on('keydown', function(e) {
		if(e.ctrlKey  && e.keyCode == 13) {
			sent();
		}
	});

	// ---

	function sent() {
		var msg = $('#my-msg').val();
		$('#my-msg').val('');

		if(!msg.length) return;

		var tpl = _.template($('#t-msg').html());
		list.append( tpl({log: [{msg: msg, login: loginGlob, date: (new Date()).getTime()}]}) );

		scrollBottom()

		ws.send(JSON.stringify({msg: msg}));
	}

	function buildLog() {
		getLog().then(function(res) {
			var tpl = _.template($('#t-msg').html());

			list.html( tpl({log:res}) );

			scrollBottom();

		});
	}

	function scrollBottom() {
  		var elem = $('.r-side').get(0);
  		elem.scrollTop = elem.scrollHeight;
	}

	function initLogin() {
		loginWrapper.show();
		wrapper.hide();
	}

	function enter(login) {
		return $.ajax({
			url: '/j_create',
			type: 'get',
			dataType: 'json',
			data: {login: login}
		});
	}

	function getLog() {
		return $.ajax({
			url: '/j_log',
			type: 'get',
			dataType: 'json'
		});
	}

	function loginStat() {
		return $.ajax({
			url: '/j_stat',
			type: 'get',
			dataType: 'json'
		});
	}

	function getOnline() {
		return $.ajax({
			url: '/j_online',
			type: 'get',
			dataType: 'json'
		});
	}

	function acceptMsg(e) {
		var data = JSON.parse(e.data);

		console.log(data);

		if(data) {
			data.onlineUpdate && upOnline(data.online);
			data.body && addMessage(data.body);
		}
	}

	function addMessage(data) {
		var tpl = _.template($('#t-msg').html());
		
		data.time = (new Date()).getTime();

		list.append( tpl({log: [data]}) );

		bip();

		scrollBottom();
	}

	function setOnline() {
		getOnline().then(function(res) {
			if(res.stat) {
				var tpl = _.template($('#t-online').html());

				$('#online-list').html(tpl({users: res.online}));

				setTimeout(setOnline, 5000);
			}
		});
	}

	function upOnline(data) {
		console.log('online update', data);
	}

	function bip() {
		var audio = $('#bip');
		audio.stop();
		audio.get(0).play()
	}

	function closeConn(e) {
		alert('Соединение закрыто сервером, попробуйте обновить страницу');
	}

	function initChat(login) {
		loginGlob = login;
		$('#iam').text(loginGlob);

		window.ws = new WebSocket("ws://"+ window.location.host, 'hello');
		
		buildLog();

		setOnline();

		ws.onopen = function (event) { 
  			ws.onmessage = acceptMsg;



  			wrapper.show();
  			loginWrapper.hide();

  			ws.onclose = closeConn;
		};
	}

}();