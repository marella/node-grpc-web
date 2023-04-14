export = proxy;
/**
 * Creates an instance of `connect` server and configures `cors` and
 * `@grpc-web/middleware`.
 *
 * @param {Object} options
 * @param {grpcWeb.Target} options.target
 * @param {string} options.origin
 * @param {string | Array<string>} options.headers
 */
declare function proxy({ target, origin, headers }?: {
    target: grpcWeb.Target;
    origin: string;
    headers: string | Array<string>;
}): any;
import grpcWeb = require("@grpc-web/middleware");
//# sourceMappingURL=index.d.ts.map