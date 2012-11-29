/**
 * Created with JetBrains WebStorm.
 * User: ihansol
 * Date: 12. 11. 14.
 * Time: 오전 10:41
 * To change this template use File | Settings | File Templates.
 */
exports.env={
    redis_config:{host:'yog.io',pass:'ekfrrhrl0'},
    port_num:3000,
    setGameEvent:function(socket,io){
        //게임 관련 부분
        //스타트 요청 수신
        socket.on('LetMeStart', function(data){
            io.sockets.in(data.room).emit('gameStart', 1);
        });

        socket.on('LetMeMoveRight', function(data){
            var num = data.val;
            io.sockets.in(data.room).emit('LetHimMoveRight', num);
        });
        socket.on('LetMeMoveLeft', function(data){
            var num = data.val;
            io.sockets.in(data.room).emit('LetHimMoveLeft', num);
        });
        socket.on('LetMeStop', function(data){
            var num = data.val;
            io.sockets.in(data.room).emit('LetHimStop', num);
        });
        socket.on('LetMeFire', function(data){
            var num = data.val;
            io.sockets.in(data.room).emit('LetHimFire', num);
        });
        socket.on('BirdDied', function(data){
            var send = data.val;
            io.sockets.in(data.room).emit('SyncBirdDeath', send);
        });
        socket.on('IAmHere', function(data){
            var send = data.val;
            io.sockets.in(data.room).emit('HeIsThere', send);
        });
    }
};
