var app = require('express')();
var cookieParser = require('cookie-parser');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var msgId = 1;		//起動時からのメッセージの通番
var userKeys = {};
var redis = require("redis");
var client = redis.createClient(40998, 'scene-cloud.jp');
// ExpressでCookieを使う
app.use(cookieParser());

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });
client.on("error", function (err) {
    console.log("Error " + err);
});

app.get('/', function(req, res){
	// Cookieを設定する
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	
	//チャットメッセージ(ブロードキャスト)
  socket.on('chat message', function(msg){
	msg['id'] = msgId++;
	io.emit('chat message', msg);
  });
  
	//チャットメッセージ(自分以外ブロードキャスト)
  socket.on('chat message to others', function(msg){
	console.log('chat message to others : '+msg.msg);
	msg['id'] = msgId++;
	socket.broadcast.emit('chat message', msg);
  });
  
  	//グループ参加
  socket.on('room enter', function(msg){
	socket.join(msg.room);
	console.log('room join : '+msg.room);
	io.to(msg.room).emit('join', msg);
  });
  
    //グループ退出
  socket.on('room leave', function(msg){
	console.log('room leave : '+msg.room);
	io.to(msg.room).emit('leave', msg);
	socket.leave(msg.room);
  });
  
     //グループ会話
  socket.on('room chat message', function(msg){
	msg['id'] = msgId++;
	io.to(msg.room).emit('room chat message', msg);
  });
  
  	//1vs1メッセージ(ブロードキャスト)
  socket.on('private message', function(msg){
	client.hget('user#'+msg.dstUserId, 'socket_id', function(err, val){
  		// コールバック
  		if (err) return console.log(err);
  		// エラーが無ければデータを取得できたということ
		var socketId = val;
		console.log('target user id : '+msg.dstUserId+' socket_id : '+socketId);
		msg['id'] = msgId++;
		io.to(socketId).emit('private message', msg);
	});
	client.hget('user#'+msg.srcUserId, 'socket_id', function(err, val){
  		// コールバック
  		if (err) return console.log(err);
  		// エラーが無ければデータを取得できたということ
		var socketId = val;
		console.log('target user id : '+msg.srcUserId+' socket_id : '+socketId);
		//msg['id'] = msgId++;
		io.to(socketId).emit('private message', msg);
	});    
  });
  
  	//既読
  socket.on('kidoku', function(msg){
	console.log('kidoku : '+msg.id);
	io.emit('kidoku', msg);
  });
  
  　//ログだし(通常)
  socket.on('log', function(msg){
	io.emit('log', msg);
  });
  
    //ログだし(エラー)
  socket.on('errorLog', function(msg){
	io.emit('errorLog', msg);
  });
  
  	//ログだし(成功)
  socket.on('successLog', function(msg){
	io.emit('successLog', msg);
  });
  
  	//クッキー送信
  socket.on('cookie', function(msg){
	console.log('cookie : '+msg);
  });
  
    //ユーザー初回送信
  socket.on('setUser', function(msg){
	console.log('setUser : '+msg);
	userKeys['user#'+msg] = {user_id : msg, socket_id: socket.id};
	
	//redisに書き込み
	client.hmset('user#'+msg, {user_id : msg, socket_id: socket.id}, redis.print);
	
	io.sockets.emit('user', userKeys);
	console.log('userKeys : '+JSON.stringify(userKeys));
	});
  });

http.listen(40999, function(){
  console.log('listening on *:40999');
});
