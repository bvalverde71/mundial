require('dotenv').config()  //This package is used to get acces to env variables
const express = require('express');
const mongoose = require("mongoose") // package para connectarse a mongoDB
const bodyParser = require("body-parser");
const dbOper = require("./dbOper.js");
const _ = require("lodash"); //Este package se utiliza para manipular Strings (capitalize, convert, etc)

const app = express(); //Se crea la instancia del app

//La app utiliza body-parser para recuperar los valores de los html
app.use(bodyParser.urlencoded({
  extended: true
}));

app.set("view engine", "ejs"); // Se utiliza para inicializar el  uso templates via EJS

app.use(express.static("public")); // Se usa para referencia de tus archivos locales usando un directorio base ej "public"

//Version con conexion to MongoDB para almacenar la data
////Version local MongoDB
//mongoose.connect("mongodb://127.0.0.1:27017/Mundial");
//Version Atlas
const dbUser=process.env.DB_USER;
const dbPwd=process.env.DB_PWD;
mongoose.connect("mongodb+srv://"+dbUser+":"+dbPwd+"@micluster.ulmi81e.mongodb.net/Mundial?retryWrites=true&w=majority");

const fechaActual = new Date();
const fechaInicio = new Date("2022-11-20");
const fechaFinal = new Date("2022-12-19");
let grupo = "grupos";

if (fechaActual >= fechaInicio && fechaActual < fechaFinal)   {
  console.log("Mundial en progreso. Hoy es "+ setDateString(fechaActual));
  if (fechaActual >= Date("2022-12-03") && fechaActual >= Date("2022-12-08")){
    grupo="octavos";
  }
  console.log("Estamos en fase",grupo);
}
else console.log("No es necesario actualizar datos ");

//Mi definicion de esquema y tablas
const faseSchema = new mongoose.Schema({
  _id: String,
  title: String,
  Roundnumber: Number,
  content:[{
    grupo_id: String,
    title: String
  }]
});

const betSchema = new mongoose.Schema({
  person_id: String,
  fase_id: String,
  puntos: Number,
  bet: [{
    _id: String,
    betSelect:[String]
  }]
});

const fixtureSchema =  new mongoose.Schema({
  _id: String,
  date: String,
  status:String,
  grupo:String,
  team1:String,
  team2:String,
  team1Gol:String,
  team2Gol:String
});

const equipoSchema =  new mongoose.Schema({
  _id: Number,
  name: String,
  nameEng:String,
  grupo:String,
  puntos:{type: Number},
  lastUpdate:Date
  });

  const sistemaSchema =  new mongoose.Schema({
    _id: Number,
    lastUpdate: String
    });

const Equipo = new mongoose.model("equipos",equipoSchema);
const Fase = new mongoose.model("fases", faseSchema);
const Apuesta = new mongoose.model("apuestas", betSchema);
const Game = new mongoose.model("games",fixtureSchema);
const Sistema = new mongoose.model("sistemas",sistemaSchema);
//Carga Inicial de fixture
let count=0;
dbOper.initialLoad(count,setDateString(fechaActual),Fase,Apuesta,Game,Equipo,Sistema,grupo);

//El browser identifica esta funcion como punto de partida del app la ruta es la raiz del app "/" y como respuesta del server se manda el archivo "signup/html" que esta en la raiz
app.get("/", function(req, res) {
  const grupo = "grupos"
  if (count > 0) dbOper.initialLoad(count,setDateString(fechaActual),Fase,Apuesta,Game,Equipo,Sistema,grupo);
  console.log(count);
  count+=1;
    //console.log(c);
  Sistema.findById(1,function(err,sisValues){
    //console.log(sisValues);
    Fase.find({ _id: "grupos"},{}, function(err, fase) {
    //bets = Fase.find({ _id: "grupos"},{"content.title": 1,"title": 1,"_id": 0});
    //console.log(fase);
    //deconstructing fase para poner mas claridad a los datos que se pasaran a la pagina
    const [{title}] = fase;
    const [{content:groupTitle}]= fase;
    //contenido.push(fase);
    console.log(title);
    //Apuesta.find({fase_id:"grupos"}).sort({puntos:-1}).exec(function(err, bets){
    Apuesta.find({fase_id:grupo},null,{sort:{puntos:-1}},function(err, bets){
      //console.log(bets);
      //const bets=[];
      // bets.forEach( function(j){
      //   console.log(j.person_id);
      // });
      res.render("grupos", {
        fechaSis: sisValues.lastUpdate,
        titulo: title,
        tituloFila: groupTitle,
        data: bets
      });
    });
  });
});
});

app.get("/:groupName", function(req, res) {
  console.log(req.params.groupName);
  const groupName = _.lowerCase(req.params.groupName);
  if (groupName == "about") {
    res.render("about");
  } else {
    if (count > 0) dbOper.initialLoad(count,setDateString(fechaActual),Fase,Apuesta,Game,Equipo,Sistema,groupName);
    console.log(count);
    count+=1;
    Sistema.findById(1,function(err,sisValues){
      Fase.find({_id:groupName},{},function(err,fase){
        if (err) console.log(err)
        else {
          const [{title}] = fase;
          const [{content:groupTitle}]= fase;
          //contenido.push(fase);
          console.log(title);
          //Apuesta.find({fase_id:"grupos"}).sort({puntos:-1}).exec(function(err, bets){
          Apuesta.find({fase_id:groupName},null,{sort:{puntos:-1}},function(err, bets){
            res.render("knockouts", {
              fechaSis: sisValues.lastUpdate,
              titulo: title,
              tituloFila: groupTitle,
              data: bets
            });
          });
        }
      });
    });
  }
});

//Cuando se necesita extraer los datos introducidos en un html form, esta funcion es la que procesa extrae los datos usando el body-parser package. en este ejemplo se extrae 3 parametros
app.post("/", function(req, res) {
  const nombres = req.body.nombre;
  const apellido = req.body.apellido;
  const email = req.body.email;
  console.log(nombres, apellido, email);

  //Aqui luego se pone toda la logica que se necesite despues del post
});

//Esta funcio se uitliza si se quiere tener otro punto de proceso en otro html "/failure". En este caso solo se usa para redireccionar al punto raiz "/"
app.post("/failure", function(req, res) {
  res.redirect("/");
});


//Esta es la funcion que unicia el server y escucha en el puerto assignado por environment variables o el puerto 3000 (generalmente usado para desarrollo en la maquina local localhost o 127.0.0.1)
app.listen(process.env.PORT || 3000, function() {
  console.log("Server iniciado con exito!. Bienvenidos!")
});

function setDateString(fecha){
  const year = fecha.toLocaleString("default",{year:"numeric"});
  //const mes = fecha.getMonth()+1;
  const mes = fecha.toLocaleString("default",{month:"2-digit"});
  //let dia = fecha.getDate();
  const dia = fecha.toLocaleString("default",{day:"2-digit"});
  //if (dia.length = 1) dia = "0"+dia;
  return year + "-" + mes + "-" + dia;
}
