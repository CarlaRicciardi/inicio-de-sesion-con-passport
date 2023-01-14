const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const PORT = 8080;
const io = require('socket.io')(httpServer);
const generateFakeProducts = require('./utils/fakeProductGenerator');
const MensajesDaoMongoDB = require('./daos/mensajesDaoMongoDB.js');
const ProductosDaoMongoDB = require('./daos/productosDaoMongoDB.js');
const mongoose = require('mongoose');
const { normalize, schema, denormalize } = require('normalizr');

const session = require('express-session');
const MongoStore = require('connect-mongo');

//passport
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Users = require('./models/users.js');
const bcrypt = require('bcrypt');
const routes = require('./routes.js');

const { engine } = require('express-handlebars');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(__dirname + '/public'));

//handlebars settings
app.set('view engine', 'hbs');
app.set('views', './views');
app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    defaultLayout: 'index.hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
  })
);

//MONGOOSE CONNECTION
async function connectMG() {
  try {
    await mongoose.connect('mongodb+srv://carlaRicciardi:mongoatlas123@cluster0.uzjmdzn.mongodb.net/test', { useNewUrlParser: true });
    console.log('Conectado a mongo!');
  } catch (e) {
    console.log(e);
    throw 'can not connect to the db';
  }
}

connectMG();

const products = new ProductosDaoMongoDB();
const msgs = new MensajesDaoMongoDB();

//config passport
function isValidPassword(user, password) {
  return bcrypt.compareSync(password, user.password);
}

function createHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

passport.use(
  'login',
  new LocalStrategy((username, password, done) => {
    Users.findOne({ username }, (err, user) => {
      if (err) return done(err);

      if (!user) {
        console.log('User Not Found with username ' + username);
        return done(null, false);
      }
      if (!isValidPassword(user, password)) {
        console.log('Invalid Password');
        return done(null, false);
      }
      return done(null, user);
    });
  })
);

passport.use(
  'signup',
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    (req, username, password, done) => {
      Users.findOne({ username: username }, function (err, user) {
        if (err) {
          console.log('Error in SignUp: ' + err);
          return done(err);
        }
        if (user) {
          console.log('User already exists');
          return done(null, false);
        }
        const newUser = {
          username: username,
          password: createHash(password),
        };
        Users.create(newUser),
          (err, userWithId) => {
            if (err) {
              console.log('Error in Saving user: ' + err);
              return done(err);
            }
            console.log(user);
            console.log('User Registration succesful');
            return done(null, userWithId);
          };
      });
    }
  )
);
//serializar y deserializar
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser((id, done) => {
  Users.findById(id, done);
});

//SESSION WITH MONGO
app.use(
  session({
    store: MongoStore.create({
      mongoUrl: 'mongodb+srv://carlaRicciardi:mongoatlas123@cluster0.uzjmdzn.mongodb.net/test',
      mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
      ttl: 60,
    }),
    secret: 'secretKey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 },
  })
);

app.use(passport.initialize()); //inicializamos passport dentro de express
app.use(passport.session()); //meto la sesion de passport adentro de la app (serializ y deserializ)

//ROUTES
app.get('/', routes.getRoute);
app.get('/login', routes.getLogin);
app.get('/failLogin', routes.getFailLogin);
app.get('/signup', routes.getSignUp);
app.get('/failSignUp', routes.getFailSignUp);
// app.get('/userExists',)
app.get('/logout', routes.getLogout);
app.get('*', routes.failRoute);

//post login y signup se mete passport primero
app.post('/login', passport.authenticate('login', { failureRedirect: '/failLogin' }), routes.postLogin);
app.post('/signup', passport.authenticate('signup', { failureRedirect: '/failSignUp' }), routes.postSignUp);

//BACK END
//WEBSOCKET PARA TABLA DE PRODUCTOS
//1) conexion server
io.on('connection', async (socket) => {
  console.log('usuario conectado');
  socket.emit('msgs', await msgs.getAll());
  socket.emit('products', await products.getAll());
  const aux = generateFakeProducts(5);
  socket.emit('prod-test', aux);

  //3) atrapamos el sendProd que hace el front cuando llena el form
  socket.on('newProd', async (data) => {
    await products.save(data);
    const updateList = await products.getAll();
    io.sockets.emit('products', updateList); //se la envio a todos los sockets
  });

  socket.on('newMsg', async (data) => {
    await msgs.save(data);
    const msgsList = msgs.getAll();
    io.sockets.emit('msgs', msgsList);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor http escuchando en el puerto http://localhost:${PORT}`);
});
