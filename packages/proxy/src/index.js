const connect = require('connect');
const cors = require('cors');
const grpcWeb = require('@grpc-web/middleware');

/**
 * Creates an instance of `connect` server and configures `cors` and
 * `@grpc-web/middleware`.
 *
 * @param {Object} options
 * @param {grpcWeb.Target} options.target
 * @param {string} options.origin
 * @param {string | Array<string>} options.headers
 */
const proxy = ({ target, origin, headers } = {}) => {
  const app = connect();
  const corsOptions = getCorsOptions({ origin, headers });
  app.use(cors(corsOptions));
  app.use(grpcWeb(target));
  return app;
};

/**
 * Creates options object for `cors` middleware.
 *
 * @param {Object} options
 * @param {string} options.origin
 * @param {string | Array<string>} options.headers
 * @returns {Object}
 */
const getCorsOptions = ({ origin, headers }) => {
  // See https://github.com/grpc/grpc-web/blob/master/doc/browser-features.md#cors-support
  const options = {
    exposedHeaders: 'grpc-status,grpc-message',
    methods: 'POST',
    credentials: true,
  };
  if (origin) {
    options.origin = origin;
  }
  if (Array.isArray(headers)) {
    headers = headers.join(',');
  }
  if (headers) {
    options.exposedHeaders += ',' + headers;
  }
  return options;
};

module.exports = proxy;
