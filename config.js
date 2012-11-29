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
    app_init:function(app,express,path){
        var RedisStore = require('connect-redis')(express);
        var redis=new RedisStore(exports.env.redis_config);
        app.set('port', process.env.PORT || exports.env.port_num);
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
    }
};
