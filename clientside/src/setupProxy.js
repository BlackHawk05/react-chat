const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/authchat',
    createProxyMiddleware({
      target: 'http://react.hl2.su:8080',
      changeOrigin: true,
    })
  );
};