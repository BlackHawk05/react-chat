const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/authchat',
    createProxyMiddleware({
      target: process.env.REACT_APP_SERVER_HOST,
      changeOrigin: true,
    })
  );
};