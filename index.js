const mysql = require("mysql2");
const express = require("express");
const session = require('express-session');
const port = process.env.PORT || 5000;
var key = false;
 
const connection = mysql.createConnection({
    host: "remotemysql.com",
    user: "rFnAPuHZXv",
    password: "fFibUtbJiV"
  });
   
  // Создание базы данных
  connection.query("CREATE DATABASE IF NOT EXISTS rFnAPuHZXv",
    function(err, results) {
      if(err) console.log(err);
      else console.log("База данных rFnAPuHZXv открыта.");    
  });
  
  connection.query("USE rFnAPuHZXv");
  
  // Создание таблицы
const sql1 = `create table if not exists masters(
      id int primary key auto_increment,
      name varchar(255) not null,
      password varchar(255) not null)`;
     
connection.query(sql1, function(err, results) {
    if(err) console.log(err);
    else console.log("Таблица masters создана.");
});

connection.query("DELETE FROM masters WHERE name='Admin' OR id=1");

const sql2 = "INSERT INTO masters(id, name, password) VALUES(1, 'Admin','12345')";
 
connection.query(sql2, function(err, results) {
    if(err) console.log(err);
    else console.log("Таблица masters инициализирована.");
});
const sql3 = `create table if not exists cats1(
    id int primary key auto_increment,
    name varchar(255) not null,
    breed varchar(255) not null,
    age varchar(255) not null)`;                     
connection.query(sql3, function(err, results) {
    if(err) console.log(err);
    else console.log(`Таблица cats1 создана.`); 
});  
const pool = mysql.createPool({
    connectionLimit: 50,
    host: "remotemysql.com",
    user: "rFnAPuHZXv",
    database: "rFnAPuHZXv",
    password: "fFibUtbJiV"
});

// функция промежуточной обработки для предоставления статических файлов
const app = express();
app.use(express.static('assets'));

// создаем парсер для данных в формате json
const jsonParser = express.json();

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));
// Authentication and Authorization Middleware
var auth = function(req, res, next) {
    if (req.session && parseInt(req.session.user) && req.session.admin) return next(); 
  //  else res.redirect("/");
};


// проходим процедуру авторизации
app.post("/registration", jsonParser, function (req, res) {         
    if(!req.body) return res.sendStatus(400);
    const name = req.body.name;
    const password = req.body.password;   

    pool.query("SELECT * FROM masters WHERE name=? AND password=?", [name, password], function(err, data) {
      if(err) return console.log(err);
      var insertId;
      if (!data[0]) {        
        pool.query("INSERT INTO masters (name, password) VALUES (?,?)", [name, password], function(err, data) {
            if(err) return console.log(err);
            insertId = data.insertId;
            // Создание таблицы
            const sql4 = `create table if not exists cats${insertId}(
                id int primary key auto_increment,
                name varchar(255) not null,
                breed varchar(255) not null,
                age varchar(255) not null)`;                     
            pool.query(sql4, function(err, results) {
                if(err) console.log(err);
                else console.log(`Таблица cats${insertId} создана.`); 
            });
        });            
      }

    });
});


// получаем данные от клиента
app.post("/login", jsonParser, function (req, res) {         
    if(!req.body) return res.sendStatus(400);
    const name = '' + req.body.name;
    const password = '' + req.body.password;
    pool.query("SELECT * FROM masters WHERE name=? AND password=?", [name, password], function(err, data) {
      if(err) return console.log(err);
      if (data[0]) { 
        if (data[0].name == 'Admin') key = true;        
        req.session.user = data[0].id;
        req.session.admin = true; 
        res.json({ auth: true });
      } else res.json({ auth: false });
    });     
});

// выход из админки для юзера
app.post("/logout", jsonParser, function (req, res) {         
    if(!req.body) return res.sendStatus(400);
    req.session.destroy();
});

// отправляем всех котиков хозяину
app.get("/api/cats", auth, function(req, res){
    pool.query(`SELECT * FROM cats${req.session.user}`, function(err, data) {
        if(err) return console.log(err);
        res.send(data);
    });    
});

// получем id редактируемого пользователя, получаем его из бд и отправлям
app.get("/api/cats/:id", auth, function(req, res){
    const id = req.params.id;
    pool.query(`SELECT * FROM cats${req.session.user} WHERE id=?`, [id], function(err, data) {
      if(err) return console.log(err);
       res.send(data[0]);
    });
});

// получаем отправленные данные и добавляем их в БД 
app.post("/api/cats", auth, jsonParser, function (req, res) {         
    if(!req.body) return res.sendStatus(400);
    const name = req.body.name;
    const breed = req.body.breed;
    const age = req.body.age;
    pool.query(`INSERT INTO cats${req.session.user} (name, breed, age) VALUES (?,?,?)`, [name, breed, age], function(err, data) {
      if(err) return console.log(err);
      req.body.id = data.insertId;
      res.json(req.body);
    });
});


// получаем отредактированные данные и отправляем их в БД
app.put("/api/cats", auth, jsonParser, function (req, res) {
         
    if(!req.body) return res.sendStatus(400);
    const name = req.body.name;
    const breed = req.body.breed;
    const age = req.body.age;
    const id = req.body.id;
     
    pool.query(`UPDATE cats${req.session.user} SET name=?, breed=?, age=? WHERE id=?`, [name, breed, age, id], function(err, data) {
      if(err) return console.log(err);
      else res.json(req.body);
    });
});

// получаем id удаляемого пользователя и удаляем его из бд
app.delete("/api/cats/:id", auth, function(req, res){
          
    const id = req.params.id;
    pool.query(`SELECT * FROM cats${req.session.user} WHERE id=?`, [id], function(err, data) {
      if(err) return console.log(err);
       res.send(data[0]);
       pool.query(`DELETE FROM cats${req.session.user} WHERE id=?`, [id], function(err, data) {
        if(err) return console.log(err);
        });
    });
    
});

// выход из админки для владельца
app.use("/quit",function (req, res) { 
    if (key) {   
    req.session.destroy();
    key = false;
    connection.end();
    pool.end();
    console.log('Application is closing...');
    app.close;
    process.exit(0);
    }
});


// загрузка фронтенда в браузер
app.get("/", function(request, response){    
    response.sendFile(__dirname + "/cat.html");     
});
  
app.listen(port, ()=>{console.log(`Сервер запущен по адресу http://localhost:${port}.`);});