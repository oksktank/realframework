/**
 * Created with JetBrains WebStorm.
 * User: ihansol
 * Date: 12. 11. 14.
 * Time: 오전 10:41
 * To change this template use File | Settings | File Templates.
 */
exports.env={
    init:function(){
        var express = require('express');
        var path = require('path');
        var app = express();
        app.configure(function(){
            exports.env.app_init(app,express,path);
        });
        app.configure('development', function(){
            app.use(express.errorHandler());
        });

        exports.env.server_init(app);

    },
    app_init:function(app,express,path){
        var config=require('./config');
        var RedisStore = require('connect-redis')(express);
        var redis=new RedisStore(config.env.redis_config);
        app.set('port', process.env.PORT || config.env.port_num);
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.use(express.favicon());
        //app.use(express.logger('dev'));
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.cookieParser());
        app.use(express.session({store: redis, secret: "team real" })); //이 두줄은 항상 app.router앞에 있어야함
        app.use(function(req, res, next) {
            if(req.session==undefined){
                req.session.loginUser={};
            }
            res.locals.session = req.session
            next();
        });
        app.use(app.router);

        app.use(express.static(path.join(__dirname, 'public')));
    },
    server_init:function(app){
        var express = require('express')
            ,socketio=require('socket.io')
            , routes = require('./routes')
            , user = require('./routes/user')
            , http = require('http')
            , path = require('path')
            ,util=require('./routes/util')
            ,room=require('./routes/room')
            ,config=require('./config');
        var server=http.createServer(app).listen(app.get('port'), function(){
            console.log("Express server listening on port " + app.get('port'));
        });
        var io=socketio.listen(server);
        var roomJson={};
        io.set('log level', 1);
        //각 방에 player stack을 추가함.
        function addRoom(roomName){
            if(roomJson[roomName]==undefined){
                roomJson[roomName]={name:roomName,maxUser:4,makeTime:'',userList:{},/*여기*/playerStack:new Array()};
                io.sockets.emit('roomAdded',{roomName:roomName});
            }
        }

        //array 에서 해당 주소를 pick out 하는 함수
        //player 목록 관리에 필요함
        function pickOut(array, idx)
        {
            var array1 = array.slice(0, idx)
            var array2 = array.slice(idx+1,array.length)
            return array1.concat(array2)
        }
        var player = {};
        var loginUserList = {};
        io.on('connection',function(socket){
            socket.on('disconnect',function(){
                socket.get('room',function(err,room){
                    if(room!=null){

                        //////////////
                        var index;
                        for(var i = 0; i < roomJson[room].playerStack.length; i++)
                        {
                            if(roomJson[room].playerStack[i] == socket.id)
                            {
                                index = i;
                                break;
                            }
                        }
                        roomJson[room].playerStack = pickOut(roomJson[room].playerStack,index);
                        //////////////
                        io.sockets.in(room).emit('leaveUser',{socketId:socket.id,user:roomJson[room].userList[socket.id]});
                        delete roomJson[room].userList[socket.id];
                    }
                });
            });
            socket.on('signIn',function(loginUser){
                var id=loginUser.id;
                loginUserList[id] =  loginUser;
            });
            socket.on('makeRoom',function(roomName){
                addRoom(roomName);

            });
            socket.on('joinRoom',function(data){
                var roomName=data.roomName;
                var id=data.id;
                if(roomJson[roomName]==undefined){
                    console.log('해당 방 없음');
                    //addRoom(roomName);
                }else{
                    socket.set('room',roomName);
                    socket.join(roomName);
                    roomJson[roomName].userList[socket.id]=loginUserList[id];
                    roomJson[roomName].playerStack.push(socket.id);
                    io.sockets.in(roomName).emit('joinUser',{socketId:socket.id,user:loginUserList[id],CurrentPlayerStack: roomJson[roomName].playerStack});
                }

            });
            socket.on('leaveRoom',function(data){
                socket.leave(data);
            });
            //이벤트 스코어
            ////////원석//////////////
            //스코어
            socket.on('scoreClient', function(data){

                var nowRoom=player[data.room];
                if(nowRoom==undefined){
                    player[data.room]={};
                }
                var nowPlayer=player[data.room]['player'+data.name];
                if(nowPlayer==undefined){
                    var newPlayer=data;

                    player[data.room]['player'+data.name]=newPlayer;
                    nowPlayer=newPlayer;
                }else{
                    nowPlayer.score=parseInt(nowPlayer.score)+parseInt(data.score);
                }

                player[data.room]['player'+nowPlayer.name]=nowPlayer;
                io.sockets.in(data.room).emit('scoreServer', nowPlayer);
            });
            socket.on('scoreResetClient', function(data){

                for(var i in player[data.room]){
                    player[data.room][i].score = 0;
                }
                io.sockets.in(data.room).emit('scoreResetServer', {});
            });
            //이벤트
            socket.on('eventClient', function(data){

                io.sockets.in(data.room).emit('eventServer', data);
            });


            ///채팅
            socket.on('message', function(data){
                if(data.type == 'public')
                {
                    var nameid = data.name;
                    data.name = roomJson[data.room].userList[nameid].id;
                    io.sockets.in(data.room).emit('message', data);
                }
                else
                {
                    //귓속말 처리
                    var nameid = data.name;
                    data.name = roomJson[data.room].userList[nameid].id;
                    var typeid = data.type;
                    data.type = roomJson[data.room].userList[typeid].id;
                    //귓속말 한 사람에게
                    data.dir=1;
                    io.sockets.sockets[nameid].emit('whisper', data);
                    //귓속말 받을 사람에게
                    data.dir=0;
                    io.sockets.sockets[typeid].emit('whisper', data);
                }
            });

            config.env.setGameEvent(socket,io);

        });
        app.get('/', routes.index);
        app.get('/users', user.list);
        app.post('/user/login',function(req,res){

            req.session.loginUser={id:req.body.id};
            req.session.loginId=req.body.id;
            res.send(req.session.loginUser);
        });
        app.post('/user/getLoginUser',function(req,res){
            res.send(req.session.loginUser);
        });
        app.get('/roomList',function(req, res){
            res.render('roomList', { title: 'RoomList',roomList:JSON.stringify(roomJson)});
        });
        app.get('/room/:name',function(req,res){
            //var roomId=req.params.id;
            var roomName=req.params.name;

            res.render('room', { title: 'Room:'+roomName,roomName:roomName});

        });
        app.post('/room/getInitialUserList',function(req,res){
            var roomName=req.body.roomName;
            if(roomJson[roomName]!=undefined){
                res.send(roomJson[roomName].userList);
            }else{
                res.send({});
            }


        });
        app.get('/sendMessageTo/:roomName',function(req,res){
            //var roomId=req.params.id;
            var roomName=req.params.name;
            io.sockets.in(roomName).emit('roomMessage','messageTo:'+roomName);
            res.send('sendMessage');
        });


    }
};
