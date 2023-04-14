/// <reference types="node" />
export = middleware;
/**
 * Returns a function that handles gRPC Web requests.
 *
 * @param {Target} target
 * @returns {function(HttpIncomingMessage, HttpServerResponse, Function)}
 */
declare function middleware(target: Target): (arg0: HttpIncomingMessage, arg1: HttpServerResponse, arg2: Function) => any;
declare namespace middleware {
    export { Target, HttpIncomingMessage, HttpServerResponse };
}
type Target = string | URL | (() => http2.ClientHttp2Session);
type HttpIncomingMessage = import('node:http').IncomingMessage;
type HttpServerResponse = import('node:http').ServerResponse;
import http2 = require("node:http2");
//# sourceMappingURL=index.d.ts.map