const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const PORT = 8080;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

function generateRandomString() {
  let random = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for(let i = 0; i < 6; i++) {
    random += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return random;
}

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}

let urlDatabase = {
  "b2xVn2" : "http://lighthouselabs.ca",
  "9sm5xK" : "http://www.google.com"
};

app.get("/", (request, response) => {
  response.send("Hello!");
});

app.get("/urls", (request, response) => {
  let templateVars = { urls: urlDatabase, username: request.cookies["username"]};
  response.render("urls_index", templateVars);
});

app.get("/urls/new", (request, response) => {
  response.render("urls_new");
});

app.get("/urls/:id", (request, response) => {
  let templateVars = { shortURL: request.params.id, urls: urlDatabase, username: request.cookies["username"]};
  if(urlDatabase[request.params.id]) {
  response.render("urls_show", templateVars);
  }
  response.render("urls_doesNotExist", templateVars);
});

app.get("/urls.json", (request, response) => {
  response.json(urlDatabase);
});

app.get("/u/:shortURL", (request, response) => {
  if(urlDatabase[request.params.shortURL]) {
    let longURL = urlDatabase[request.params.shortURL];
    response.redirect(longURL);
  } else {
    let templateVars = { shortURL : request.params.shortURL };
    response.render("urls_doesNotExist", templateVars);
  }
});

app.get("/register", (request, response) => {
  response.render("register");
});

app.post("/urls/:id", (request, response) => {
  urlDatabase[request.params.id] = request.body.newURL;
  response.redirect('/urls');
});

app.post("/urls", (request, response) => {
  if(request.body.longURL) {
    let short = generateRandomString();
    urlDatabase[short] = request.body.longURL;
    response.redirect('/urls');
  }
});

app.post("/urls/:id/delete", (request,response) => {
  if(urlDatabase[request.params.id]) {
    delete urlDatabase[request.params.id];
  }
  response.redirect('/urls');
});

app.post("/register", (request, response) => {
  const newId = generateRandomString();
  users[newId] = { id : newId, email : request.body.email, password : request.body.password };
  console.log(users);
  response.cookie('user_id', newId);
  response.redirect('/urls');
});

app.post("/login", (request, response) => {
  if(request.body.username) {
    response.cookie('username', request.body.username);
  }
  response.redirect('/urls');
});

app.post('/logout', (request, response) => {
  response.clearCookie('username');
  response.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});