const http2 = require('node:http2');
const stream = require('node:stream');
const parseUrl = require('parseurl');
const { Base64Encode, Base64Decode } = require('base64-stream');
const debug = require('debug')('@grpc-web/middleware');

/**
 * Returns a function that handles gRPC Web requests.
 *
 * @param {Target} target
 * @returns {function(HttpIncomingMessage, HttpServerResponse, Function)}
 */
const middleware = (target) => {
  const options = validateOptions(target);

  return (req, res, next) => {
    if (isGrpcWebRequest(req)) {
      handle(options, req, res);
    } else {
      next();
    }
  };
};

/**
 * Validates and constructs a new options object.
 *
 * @param {Target} target
 * @returns {Object}
 */
const validateOptions = (target) => {
  if (!target) {
    throw new Error('Please specify the gRPC server address.');
  }
  const options = {};
  if (typeof target === 'function') {
    options.connect = target;
  } else {
    options.connect = () => http2.connect(target);
  }
  return options;
};

/**
 * Checks if the given HTTP request is a gRPC Web request.
 *
 * @param {HttpIncomingMessage} req
 * @returns {boolean}
 */
const isGrpcWebRequest = ({ method, headers }) => {
  if (method !== 'POST') {
    return false;
  }
  const type = headers['content-type'] || '';
  return (
    type === 'application/grpc-web-text' ||
    type === 'application/grpc-web' ||
    type.startsWith('application/grpc-web-text+') ||
    type.startsWith('application/grpc-web+')
  );
};

/**
 * Translates the gRPC Web request to the gRPC server and
 * translates the gRPC server response back to the client.
 *
 * @param {Object} options
 * @param {function(): http2.ClientHttp2Session} options.connect
 * @param {HttpIncomingMessage} req
 * @param {HttpServerResponse} res
 */
const handle = (options, req, res) => {
  const client = options.connect();

  res.setHeader('content-type', req.headers['content-type']);
  res.on('close', () => {
    client.close();
  });

  client.on('connect', () => {
    const rpc = createRpc(client, req);
    handleRpc(rpc, req, res);
  });

  client.on('error', (error) => {
    debug('An error occurred while connecting to the gRPC server.\n%O', error);
    res.statusCode = 503;
    res.end();
  });
};

/**
 * Sends request to the gRPC server.
 *
 * @param {http2.ClientHttp2Session} client
 * @param {HttpIncomingMessage} req
 * @returns {http2.ClientHttp2Stream}
 */
const createRpc = (client, req) => {
  const type = req.headers['content-type'];
  const index = type.indexOf('+');
  const format = index !== -1 ? type.substring(index) : '';

  return client.request({
    ...filterHeaders(req.headers),
    ':method': 'POST',
    ':path': parseUrl(req).pathname,
    'content-type': 'application/grpc' + format,
  });
};

/**
 * Handles the response from the gRPC server.
 *
 * @param {http2.ClientHttp2Stream} rpc
 * @param {HttpIncomingMessage} req
 * @param {HttpServerResponse} res
 */
const handleRpc = (rpc, req, res) => {
  const reply = new stream.PassThrough();
  if (req.headers['content-type'].startsWith('application/grpc-web-text')) {
    req.pipe(new Base64Decode()).pipe(rpc);
    reply.pipe(new Base64Encode()).pipe(res);
  } else {
    req.pipe(rpc);
    reply.pipe(res);
  }

  rpc.on('response', (headers) => {
    res.writeHead(200, filterHeaders(headers));
    rpc.pipe(reply, { end: false });
    getTrailers(rpc, { end: false }).pipe(reply);
  });

  rpc.on('end', () => {
    reply.end();
  });

  rpc.on('error', (error) => {
    debug(
      'An error occurred while sending the request to the gRPC server.\n%O',
      error
    );
    res.statusCode = 502;
    reply.end();
  });
};

/**
 * List of headers that shouldn't be forwarded from gRPC Web client to the
 * gRPC server and vice versa.
 *
 * @type {Set<string>}
 */
const ignoredHeaders = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'connection',
  'content-length',
  'content-type',
  'dnt',
  'host',
  'keep-alive',
  'origin',
  'pragma',
  'proxy-connection',
  'referer',
  'transfer-encoding',
  'upgrade',
  'x-grpc-web',
  'x-user-agent',
]);

/**
 * Removes HTTP/2 pseudo-headers and other headers that shouldn't be forwarded
 * from gRPC Web client to the gRPC server and vice versa.
 *
 * @param {Object} headers
 * @returns {Object}
 */
const filterHeaders = (headers) => {
  const result = {};
  for (const name in headers) {
    if (!name.startsWith(':') && !ignoredHeaders.has(name)) {
      result[name] = headers[name];
    }
  }
  return result;
};

/**
 * Encodes and returns the trailers from the gRPC server response as a stream.
 *
 * @param {http2.ClientHttp2Stream} rpc
 * @returns {stream.Readable}
 */
const getTrailers = (rpc) => {
  const res = new stream.PassThrough();

  rpc.on('trailers', (headers) => {
    const trailers = [];
    // See https://www.rfc-editor.org/rfc/rfc7230#section-4.1.2
    for (const [name, header] of Object.entries(headers)) {
      trailers.push(`${name}:${header}\r\n`);
    }

    const bytes = Buffer.from(trailers.join(''), 'utf8');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);

    // See https://github.com/improbable-eng/grpc-web/issues/194#issuecomment-970503606
    const buffer = Buffer.concat([Buffer.of(0x80), length, bytes]);
    res.end(buffer);
  });

  return res;
};

/**
 * @typedef {string | URL | function(): http2.ClientHttp2Session} Target
 */

/**
 * @typedef {import('node:http').IncomingMessage} HttpIncomingMessage
 */

/**
 * @typedef {import('node:http').ServerResponse} HttpServerResponse
 */

module.exports = middleware;
