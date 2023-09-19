//jshint esversion:6

require('dotenv').config();
const mongoose = require('mongoose');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const md5 = require("md5");

// for user authentication, install required package [passport, passport-local, passport-local-mongoose, express-session]

// 1. require all package
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

// for google auth Strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();
const posts = [];


app.set('view engine', 'ejs');                                  // to use ejs file
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));                              // to use static files


// 2. create the session, before making the databse connection and after app.set()
app.use(session({
  secret: "Our Little Secret.",
  resave: false,
  saveUninitialized: false
}));


// 3. intialize passport
app.use(passport.initialize());           // set passport to start using authentication
app.use(passport.session());               // setting passport to use the session

mongoose.connect("mongodb+srv://admin-abhishek:abhishek123@cluster0.ir17ptx.mongodb.net/blogDB");     // database connection

const PostSchema = new mongoose.Schema({                // creating schema for blogDB
  title:String,
  content:String
});

const UserSchema = new mongoose.Schema({                // creating schema to store user information
  email:String,
  password:String,
  googleId:String
});


// 4. setting passport-local-passport-local-mongoose
UserSchema.plugin(passportLocalMongoose);                   // used for hashing password and save the user in mongodb
UserSchema.plugin(findOrCreate);



/////////////////////// for encryption of password, always create before creating models////////////////////////////
// const secret = "Thisisourlittlesecret."                           // secret should passed in encryption
// UserSchema.plugin(encrypt, { secret:secret, encryptedFields:['password']});           // for encrypting password, always create before creating models


const Post = mongoose.model('Blog', PostSchema);        // creating model from PostSchema
const User = mongoose.model('User', UserSchema);        // creating model from UserSchema

// 5. user serializer for session
passport.use(User.createStrategy());
//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});


passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

// for google autherization, should be written after session and serialiser
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,                                      // taking client id from .env file
    clientSecret: process.env.CLIENT_SECRET,                                  // taking client secret from .env file
    callbackURL: "http://localhost:3000/auth/google/dailyjournal",              // taking callbackurl from google cloud console - Authorized Redirect URIs
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"       // to retreive user account form user info instead of google +
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function(req, res){
  res.render("index");
});


app.get("/auth/google",                                         // to authenticate with google
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/dailyjournal",                                     // when user is authenticated, google redirects to the secrets page
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/home");
  });


app.get("/home", function(req, res){            // if the user is authenticated then only he can see the home page for all post
    if(req.isAuthenticated()){
      async function findInDB() {                           // to display all record on the home page
        const Post = mongoose.model('Blog', PostSchema);
        const result = await Post.find({});                   // find all record from database
        posts.push(result);                                  // push all records from database into result
        res.render("home", {posts : result});               // return all the records in posts
      }
      findInDB().catch(err => console.log(err));
    }else {
      res.redirect("/login");
    }
});


app.post("/signup", function(req,res){      // post method for signup

  User.register({username:req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/signup");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
  // const User = mongoose.model('User', UserSchema);
  //
  // const newUser = new User({                // creating schema to store user information
  //   email:req.body.username,
  //   password:md5(req.body.password)
  // });
  // newUser.save();
  // res.redirect("/home");                      // redirect to home page after signup
});


app.post("/login", function(req,res){         // for login of existing user

  const user = new User({
    username: req.body.username,
    password: md5(req.body.password)
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
  // const username = req.body.username;
  // const password = md5(req.body.password);        // take the password and convert into hash
  //
  // async function findInDB(){
  //   const result = await User.findOne({email:username});
  //
  //   if(result){
  //     if(result.password === password){
  //       res.redirect("/home");
  //      }
  //   }
  //   else{
  //     res.redirect("/login");
  //   }
  // }
  // findInDB().catch(err => console.log(err));
});


app.get("/logout", function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }else{
      res.redirect("/");
    }
  });
});


app.get("/about",function (req,res) {
  res.render("about", {about_content : aboutContent});
});

app.get("/contact",function (req,res) {
  res.render("contact", {contact_content : contactContent});
});

app.get("/compose",function (req,res) {
  res.render("compose");
});

app.get("/signup", function(req,res){           // to go to signup page
  res.render("signup");
});

app.get("/login", function(req,res){           // to go to login page
  res.render("login");
});

app.get("/test", function(req, res){
  res.render("test");
});


app.post("/",function (req,res) {             // after creating new post from compose screen this code runs

  const post_title = req.body.postTitle;            // getting title from Compose
  const post_content = req.body.postBody;           // getting content from compose

  const post = new Post({                         // creating new doc for every record
    title : post_title,
    content : post_content
  });

  post.save();
  res.redirect("/");                // redirecting to the home page

});


app.get("/posts/:postName", function(req,res) {

  const requestedTitle = _.lowerCase(req.params.postName);      // geting the name of the post which user selected

  async function findAll(){                     // function to find all records from database

    const Post = mongoose.model('Blog', PostSchema);
    const result = await Post.find({});                       // find all the records and store in result

    result.forEach(function(post) {                           // running loop on the every record of result
      const storedTitle = _.lowerCase(post.title);            // getting the title of the current recored

      if (storedTitle === requestedTitle) {
        res.render("post",{ selectedPostTiltle:post.title, selectedPostContent:post.content})
      }
    });
  }
  findAll().catch(err => console.log(err));
});


app.post("/delete/:postName",function(req,res){       // to delete the selected post, taking the post name which user selected
  const requestedTitle = req.params.postName;
  //console.log(requestedTitle);

  async function deletePost(){
    const Post = mongoose.model('Blog', PostSchema);
    await Post.deleteOne({title:requestedTitle});       // find the post with the name and delete it
  }
  deletePost().catch(err => console.log(err));
  res.redirect("/");
});



app.listen(3000, function() {
  console.log("Server started on port 3000");
});
