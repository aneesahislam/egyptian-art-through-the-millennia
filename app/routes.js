module.exports = function (app, passport, db) {
  var axios = require('axios')

  // normal routes ===============================================================

  // shown on the home page (will also have our login links)

app.get('/', function (req, res) {
  res.render('index')
});
  
  app.get('/shabtis', function (req, res) {
    axios.get('https://collectionapi.metmuseum.org/public/collection/v1/search?departmentIds=10&hasImages=true&q="Heart Scarab"')
      .then(response => {
        // console.log(response)
        const requests = response.data.objectIDs.slice(0, 48).map(objectID => axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`));
        axios.all (requests).then(axios.spread((...responses) => {
          // console.log(responses)
          const result = responses.map (response => response.data)

          console.log(result)
          res.render('shabtis.ejs', { art: result });
        }))
      })
      .catch(error => console.error('Axios error:', error))
  });

  app.get('/object/:objectID', function (req, res) {
    axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${req.params.objectID}`)
      .then(response => {
        // Fetch comments for this art object
        db.collection('art').find({ objectID: req.params.objectID }).toArray((err, comments) => {
          if (err) return console.log(err);
          res.render('object.ejs', { 
            art: response.data,
            comments: comments || []
          });
        });
      })
      .catch(error => {
        console.error('Connection lost to external server, please try again', error);
        res.status(500).send('Connection lost to external server, please try again');
      });
  });


  app.get('/jewerly', function (req, res) {
    axios.get('https://collectionapi.metmuseum.org/public/collection/v1/search?departmentIds=10&hasImages=true&q="necklace"')
      .then(response => {
        // console.log(response)
        const requests = response.data.objectIDs.slice(0, 48).map(objectID => axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`));
        axios.all (requests).then(axios.spread((...responses) => {
          // console.log(responses)
          const result = responses.map (response => response.data)

          console.log(result)
          res.render('jewerly.ejs', { art: result });
        }))
      })
      .catch(error => console.error('Axios error:', error))
  });

  app.get('/object/:objectID', function (req, res) {
    axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${req.params.objectID}`)
      .then(response => {
        // Fetch comments for this art object
        db.collection('art').find({ objectID: req.params.objectID }).toArray((err, comments) => {
          if (err) return console.log(err);
          res.render('object.ejs', { 
            art: response.data,
            comments: comments || []
          });
        });
      })
      .catch(error => {
        console.error('Connection lost to external server, please try again', error);
        res.status(500).send('Connection lost to external server, please try again');
      });
  }); 



  // PROFILE SECTION =========================
  app.get('/profile', isLoggedIn, function (req, res) {
    db.collection('messages').find().toArray((err, result) => {
      if (err) return console.log(err)
      res.render('profile.ejs', {
        user: req.user,
        messages: result
      })
    })
  });

  // GO HOME ==============================
  app.get('/index', function (req, res) {
    req.logout(() => {
      console.log('User has went to the home page!')
    });
    res.redirect('/');
  });

  // LOGOUT ==============================
  app.get('/logout', function (req, res) {
    req.logout(() => {
      console.log('User has logged out!')
    });
    res.redirect('/');
  });


  // // SEND USER HOME FROM OBJECT PAGE ==============================
  // app.get('/object/:objectID', function (req, res) {
  //   req.logout(() => {
  //     console.log('User has went to the home page!')
  //   });
  //   res.redirect('/');
  // });

  // =============================================================================
  //  COMMENT MANIPULATION =======================================================
  // =============================================================================

  
//POST a comment
app.post('/object/:id/art', (req, res) => {
  console.log('art')
  db.collection('art').insertOne({objectID: req.params.id, msg: req.body.msg}, (err, result) => {
    if (err) return console.log(err)
    console.log('saved to database')
    //res.render('index.ejs', {art: result})
    res.redirect(`/object/${req.params.id}`)
  })
})

//DELETE a comment

app.delete('/object/:id/art', (req, res) => {
  console.log('art')
  db.collection('art').findOneAndDelete({objectID: req.params.id, msg: req.body.msg}, (err, result) => {
    console.log(result)
    if (err) return res.send(500, err)
    res.send('Message deleted!')
  })
})


// //UPDATE a comment
// app.put('/art', (req, res) => {
//   db.collection('art')
//     .findOneAndUpdate({ name: req.body.name, msg: req.body.msg }, {
//       $set: {
//         thumbUp: req.body.thumbUp + 1
//       }
//     }, {
//       sort: { _id: -1 },
//       upsert: true
//     }, (err, result) => {
//       if (err) return res.send(err)
//       res.send(result)
//     })
// })


  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function (req, res) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // SIGNUP =================================
  // show the signup form
  app.get('/signup', function (req, res) {
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/signup', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get('/unlink/local', isLoggedIn, function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}