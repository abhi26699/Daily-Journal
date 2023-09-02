//jshint esversion:6

const mongoose = require('mongoose');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const md5 = require("md5");


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";



const app = express();
const posts = [];


app.set('view engine', 'ejs');                                  // to use ejs file

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));                              // to use static files


mongoose.connect("mongodb+srv://admin-abhishek:abhishek123@cluster0.ir17ptx.mongodb.net/blogDB");     // database connection

const PostSchema = new mongoose.Schema({                // creating schema for blogDB
  title:String,
  content:String
});

const UserSchema = new mongoose.Schema({                // creating schema to store user information
  email:String,
  password:String
});

/////////////////////// for encryption of password, always create before creating models////////////////////////////
// const secret = "Thisisourlittlesecret."                           // secret should passed in encryption
// UserSchema.plugin(encrypt, { secret:secret, encryptedFields:['password']});           // for encrypting password, always create before creating models


const Post = mongoose.model('Blog', PostSchema);        // creating model from PostSchema
const User = mongoose.model('User', UserSchema);        // creating model from UserSchema


app.get("/",function (req,res) {

  async function findInDB() {                           // to display all record on the home page
    const Post = mongoose.model('Blog', PostSchema);
    const result = await Post.find({});                   // find all record from database
    posts.push(result);                                  // push all records from database into result
    res.render("home", {posts : result});               // return all the records in posts
  }
  findInDB().catch(err => console.log(err));

});



app.post("/signup", function(req,res){      // post method for signup

  const User = mongoose.model('User', UserSchema);

  const newUser = new User({                // creating schema to store user information
    email:req.body.username,
    password:md5(req.body.password)
  });
  newUser.save();
  res.redirect("/");                      // redirect to home page after signup
});


app.post("/login", function(req,res){         // for login of existing user

  const username = req.body.username;
  const password = md5(req.body.password);        // take the password and convert into hash

  async function findInDB(){
    const result = await User.findOne({email:username});

    if(result){
      if(result.password === password){
        res.redirect("/");
       }
    }
    else{
      res.render("failure");
    }
  }
  findInDB().catch(err => console.log(err));
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
