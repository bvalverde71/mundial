require('dotenv').config()
const http = require("https");
const mongoose = require("mongoose")
const fetch = require("node-fetch");

async function restCall2(isInitialLoad, fecha){
  const apiKey = process.env.API_KEY;
  try {
    if (isInitialLoad) url = "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2022"
    else url = "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2022&date="+fecha;
    console.log(url);
    const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
          }
        };
  const restResp = await fetch(url, options)
    if (!restResp.ok) {
      throw new Error (`HTTP error: ${response.status}`)
    }
    const data = await restResp.json();
    console.log("Dentro la funcion:",data.parameters);
    return data.response;
  }
  catch (error) {
    console.error(`Could not get data: ${error}`);
  }
};

exports.initialLoad = function(firstCall,fecha, Fase, Bet, Game, Equipo){

  const fechaChar = fecha.toString();

// Verificamos si existen registros
  Game.find(function(err, result) {
    if (err) console.log(err)
    else {
      if (result.length === 0 && firstCall === 0)  {
        console.log("Collection vacia. insertado datos from API ...");
        //const cargaInicial = restCall("initialLoad", null);
        const promise = restCall2(true,null);
        promise.then((datos) =>{
          console.log("Despues de la Funcion:",datos.length);
          //Salvamos data to DB interna
              initialLoad =[];
              datos.forEach(function(element){
                const {fixture:{id}} = element;
                const {fixture:{date}} = element;
                const {fixture:{status:{short: gameStatus}}} = element;
                const {league:{round}} = element;
                const {teams:{home:{name: homeTeam}}} = element;
                const {teams:{away:{name: awayTeam}}} = element;
                const {goals:{home:homeGol}} = element;
                const {goals:{away:awayGol}} = element;
                const shortDate = date.substr(0,10);
              console.log(id,shortDate, gameStatus, round, homeTeam,homeGol,awayTeam,awayGol);
                const gameObj =
                {
                  _id: id,
                  date: shortDate,
                  status:gameStatus,
                  grupo:round,
                  team1:homeTeam,
                  team2:awayTeam,
                  team1Gol:homeGol,
                  team2Gol:awayGol
                };
               initialLoad.push(gameObj);
              });
             Game.insertMany(initialLoad,function(err){
              if (err) {
                console.log(err);
              }
              else console.log ("Datos insertados!");
            });
          });
      }
      else {
        console.log("Consultando partidos que todavia no finalizaron para "+ fechaChar);
        Game.find({date:fechaChar, status: {$ne: "FT"}},function(err, i) {
        //result.forEach(function(i){
          if (i.length > 0) {
              console.log("Juegos no actualizados, llamando al API por fecha");
              const fechaUpdate = new Date();
              const promise = restCall2(false,fechaChar);
              promise.then((datos) =>{
                datos.forEach(function(element){
                  const {fixture:{id}} = element;
                  const {fixture:{status:{short: gameStatus}}} = element;
                  const {teams:{home:{name: homeTeam}}} = element;
                  const {teams:{away:{name: awayTeam}}} = element;
                  const {goals:{home:homeGol}} = element;
                  const {goals:{away:awayGol}} = element;
                  console.log(id, gameStatus, homeGol,awayGol);
                  Game.findByIdAndUpdate(id,{$set:{status: gameStatus, team1Gol: homeGol, team2Gol:awayGol}}, function (err, doc){
                    if (err) console.log(err);
                    else {
                      console.log("status:",doc.status);
                      let actualizar = false;
                      if (doc.status != "FT" && gameStatus === "FT") actualizar = true
                      console.log("Fixture "+id+" actualizado...");

                  if (gameStatus === "FT" && actualizar){
                  if (homeGol > awayGol){
                      //home Team winner
                    //Equipo.findOneAndUpdate({nameEng:homeTeam},{$set:{puntos:puntos+3,lastUpdate:fechaUpdate}},(err,doc) => {
                    console.log("Home Equipo ganador",homeTeam);
                    updEquipos(fechaUpdate,Equipo,homeTeam,3,Fase,Bet);
                  } else if (awayGol > homeGol){
                    // away Team winner
                    updEquipos(fechaUpdate,Equipo,awayTeam,3,Fase,Bet);
                  } else if ((awayGol === homeGol) && !(awayGol === null || homeGol === null)){
                  //} else if (awayGol === homeGol) {
                    // empate
                     updEquipos(fechaUpdate,Equipo,awayTeam,1,Fase,Bet);
                     updEquipos(fechaUpdate,Equipo,homeTeam,1,Fase,Bet);
                  } else
                    console.log("Equipos no actualizados");
                  }
                }
                  });
                });
              });
          }
          });

      }
    }
  });
};

function updEquipos(fecha, Team, equipo, goles, Fase, Bet){
  console.log("Updating Equipo:",equipo);
  Team.findOne({nameEng:equipo},(err,doc) => {
  if (err) console.log(err);
  else {
    const puntosUpd = doc.puntos + goles;
    //Puntos extra si aciertan el resultado
    //if (golHome === doc.betSelect[2] && (golAway === doc.betSelect[3])
    //   puntosUpd = puntosUpd + 3;
    Team.updateOne({_id:doc._id},{$set:{puntos:puntosUpd,lastUpdate:fecha}}, (err) => {
      if (err) console.log(err);
      else  console.log("Equipo actualizado:", doc.name);
    });
    Bet.find({fase_id:"grupos","bet.betSelect":doc.name}, (err,recs) =>{
      if (err) console.log(err);
      else {
        recs.forEach(elemento =>{
          let puntosBet = elemento.puntos + goles;
          //Puntos extra si aciertan el resultado
          //if (golHome === elemento.betSelect[2] && (golAway === element.betSelect[3])
          //   puntosBet = puntosBet + 3;
           Bet.updateOne({_id:elemento._id},{$set:{puntos:puntosBet}}, (err) => {
            if (err) console.log(err);
            else  console.log("Apuesta actualizada:", elemento.person_id);
          });
        });
      }
    });
}
});
}
