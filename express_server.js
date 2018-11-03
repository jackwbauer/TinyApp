const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const methodOverride = require("method-override");
require('dotenv').config();
const PORT = 8080;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(cookieSession({
  name: 'session',
  secret: process.env.SECRETKEY,
}));

function generateRandomString() {
  let random = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for(let i = 0; i < 6; i++) {
    random += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return random;
}


function getUserFromEmail(email) {
  for(let id in users) {
    if(users[id].email == email) {
      return users[id];
    }
  }
}

//returns object of subset of short url objects that are associated with the user's id
function getURLsFromUserId(id) {
  let userURLs = {};
  for(let url in urlDatabase) {
    if(urlDatabase[url].user_id == id) {
      userURLs[url] = urlDatabase[url];
    }
  }
  return userURLs;
}

//checks urlDatabase for passed url. Returns the short URL if found. Otherwise returns an empty string
function checkDatabaseForURL(url) {
  for(let short in urlDatabase) {
    if(urlDatabase[short].url === url) {
      return short;
    }
  }
  return '';
}

function numVisits(shortURL) {
  return urlDatabase[shortURL].visits.length;
}

function numUniqueVisitors(shortURL) {
  let uniques = [];
  urlDatabase[shortURL].visits.forEach((visit) => {
    if(!uniques.includes(visit.visitor_id)) {
      uniques.push(visit.visitor_id);
    }
  });
  return uniques.length;
}

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10)
  }
}

let urlDatabase = {
  "b2xVn2" : {
    user_id : "userRandomID",
    url : "http://lighthouselabs.ca",
    visits : [{1 : 'march 3'}],
  },
  "9sm5xK" : {
    user_id : "user2RandomID",
    url: "http://www.google.com", 
    visits : [],
  },
};

app.get("/", (request, response) => {
  response.redirect('/urls');
});

app.get("/urls", (request, response) => {
  let userURLs = {};
  if(request.session.user_id) {
    userURLs = getURLsFromUserId(request.session.user_id);
  }
  let templateVars = { urls: userURLs, user: users[request.session.user_id]};
  response.render("urls_index", templateVars);
});

app.get("/urls/new", (request, response) => {
  let templateVars = { user: users[request.session.user_id]};
  if(users.hasOwnProperty(request.session.user_id)) {
    response.render("urls_new", templateVars);
  } else {
    response.render('notLoggedIn', templateVars);
  }
});

app.get("/urls/:id", (request, response) => {
  if(!users.hasOwnProperty(request.session.user_id)) {
    response.redirect('/login');
  }
  const userURLs = getURLsFromUserId(request.session.user_id);
  let templateVars = { shortURL: request.params.id,
    urls: userURLs,
    user: users[request.session.user_id],
    visits : urlDatabase[request.params.id].visits,
    uniqueVisits : numUniqueVisitors(request.params.id),
  };
  if(userURLs[request.params.id]) {
    response.render("urls_show", templateVars);
  } else if(urlDatabase[request.params.id]) {
    response.render("urls_DoesNotBelong", templateVars);
  } else {
    response.render("urls_doesNotExist", templateVars);
  }
});

app.get("/u/:shortURL", (request, response) => {
  if(urlDatabase[request.params.shortURL]) {
    let longURL = urlDatabase[request.params.shortURL].url;
    let visitor_id = 0; //TODO also generate visitor_id session
    if(!request.session.user_id) {
      request.session.visitor_id = generateRandomString();
      visitor_id = request.session.visitor_id;
    } else {
      visitor_id = request.session.user_id;
    }
    urlDatabase[request.params.shortURL].visits.push({ visitor_id, timestamp : new Date() });
    response.redirect(longURL);
  } else {
    let templateVars = { shortURL : request.params.shortURL, user : users[request.session.user_id] };
    response.render("urls_doesNotExist", templateVars);
  }
});

app.get("/register", (request, response) => {
  if(request.session.user_id) {
    response.redirect('/urls');
    return;
  }
  response.render("register");
});

app.get("/login", (request, response) => {
  let templateVars = { user: getUserFromEmail(response.email)};
  response.render("login");
});

app.get("/logout", (request, response) => {
  request.session = null;
  response.redirect('/urls');
});

app.put("/urls/:id", (request, response) => {
  urlDatabase[request.params.id].url = request.body.newURL;
  response.redirect('/urls');
});

app.post("/urls", (request, response) => {
  if(request.body.longURL) {
    let short = checkDatabaseForURL(request.body.longURL);
    if(short) {
      response.redirect(`/urls/${short}`);
      return;
    }
    short = generateRandomString();
    urlDatabase[short] = { user_id : users[request.session.user_id].id, url : request.body.longURL, visits : [] };
    response.redirect(`/urls/${short}`);
  }
});

app.delete("/urls/:id/delete", (request,response) => {
  const userURLs = getURLsFromUserId(users[request.session.user_id].id);
  if(userURLs[request.params.id]) {
    delete urlDatabase[request.params.id];
    delete userURLs[request.params.id];
  }
  response.redirect('/urls');
});

app.post("/register", (request, response) => {
  if(request.body.email && request.body.password) {
    for(let user in users) {
      if(users[user].email === request.body.email) {
        response.status(403);
        response.send('403: Email is already registered.');
        return;
      }
    }
    const newId = generateRandomString();
    users[newId] = { id : newId, email : request.body.email, password : bcrypt.hashSync(request.body.password, 10) };
    request.session.user_id = newId;
    response.redirect('/urls');
    return;
  }
  response.status(403);
  response.send('403: Email and password both require a value');
});

app.post("/login", (request, response) => {
  var user = getUserFromEmail(request.body.email);
  if(!request.body.email || !request.body.password) {
    response.status(403);
    response.send('403: Email and password both require a value');
    return;
  }
  if(!user) {
    response.status(403);
    response.send('403: Email is not registered.');
    return;
  }
  if(!bcrypt.compareSync(request.body.password, user.password)) {
    response.status(403);
    response.send('403: Invalid email and password combination.');
    return;
  }
  request.session.user_id = user.id;
  response.redirect('/urls');
});

app.post('/logout', (request, response) => {
  request.session = null;
  response.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});