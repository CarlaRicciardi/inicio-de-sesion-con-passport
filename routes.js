const getRoute = (req, res) => {
  res.render('login', {});
};

const getLogin = (req, res) => {
  if (req.isAuthenticated()) {
    const { username, password } = req.user;
    const user = { username, password };
    res.render('profileUser', { user });
  } else {
    res.render('login', {});
  }
};

const postLogin = (req, res) => {
  const { username, password } = req.user;
  const user = { username, password };
  console.log(user);
  res.render('profileUser', { user });
};

const getFailLogin = (req, res) => {
  res.render('failLogin', {});
};

const getSignUp = (req, res) => {
  if (req.isAuthenticated()) {
    const { username, password } = req.user;
    const user = { username, password };
    res.render('profileUser', { user });
  } else {
    res.render('signup');
  }
};

const postSignUp = (req, res) => {
  const { username, password } = req.user;
  const body = req;
  console.log('body:', body);
  const user = { username, password };
  res.render('successSignUp', { user });
};

const getFailSignUp = (req, res) => {
  res.render('failSignUp', {});
};

const getLogout = (req, res) => {
  req.logout();
  res.render('/');
};

const failRoute = (req, res) => {
  res.status(404).render('routing-error', {});
};

module.exports = { getRoute, getLogin, postLogin, getFailLogin, getSignUp, postSignUp, getFailSignUp, getLogout, failRoute };
