global.XMLHttpRequest = require('xhr2'); // Fill in XHR runtime.
const assert = require('assert');
const grpc = {};
grpc.web = require('grpc-web');
const startGrpcServer = require('grpc-interop-server');
const proxy = require('../src/index.js');

const { Empty } = require('./proto/js/empty_pb.js');
const {
  SimpleRequest,
  StreamingOutputCallRequest,
  EchoStatus,
  Payload,
  ResponseParameters,
} = require('./proto/js/messages_pb.js');
const clients = {
  text: require('./proto/js/test_grpc_web_text_pb.js').TestServiceClient,
  binary: require('./proto/js/test_grpc_web_pb.js').TestServiceClient,
};

const ports = {
  proxy: 8085,
  grpc: 9095,
};

const getTestCases = (TestServiceClient) => {
  const SERVER_HOST = `http://localhost:${ports.proxy}`;

  function multiDone(done, count) {
    return function () {
      count -= 1;
      if (count <= 0) {
        done();
      }
    };
  }

  function doEmptyUnary(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);
    testService.emptyCall(new Empty(), null, (err, response) => {
      assert.ifError(err);
      assert(response instanceof Empty);
      done();
    });
  }

  function doEmptyUnaryWithDeadline(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);

    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 1);
    testService.emptyCall(
      new Empty(),
      { deadline: deadline.getTime().toString() },
      (err, response) => {
        assert.ifError(err);
        assert(response instanceof Empty);
        done();
      }
    );
  }

  function doLargeUnary(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);
    var req = new SimpleRequest();
    var size = 314159;

    var payload = new Payload();
    payload.setBody('0'.repeat(271828));

    req.setPayload(payload);
    req.setResponseSize(size);

    testService.unaryCall(req, null, (err, response) => {
      assert.ifError(err);
      assert.equal(response.getPayload().getBody().length, size);
      done();
    });
  }

  function doServerStreaming(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);
    var sizes = [31415, 9, 2653, 58979];

    var responseParams = sizes.map((size, idx) => {
      var param = new ResponseParameters();
      param.setSize(size);
      param.setIntervalUs(idx * 10);
      return param;
    });

    var req = new StreamingOutputCallRequest();
    req.setResponseParametersList(responseParams);

    var stream = testService.streamingOutputCall(req);

    done = multiDone(done, sizes.length);
    var numCallbacks = 0;
    stream.on('data', (response) => {
      assert.equal(response.getPayload().getBody().length, sizes[numCallbacks]);
      numCallbacks++;
      done();
    });
  }

  function doCustomMetadata(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);
    done = multiDone(done, 3);

    var req = new SimpleRequest();
    const size = 314159;
    const ECHO_INITIAL_KEY = 'x-grpc-test-echo-initial';
    const ECHO_INITIAL_VALUE = 'test_initial_metadata_value';
    const ECHO_TRAILING_KEY = 'x-grpc-test-echo-trailing-bin';
    const ECHO_TRAILING_VALUE = 0xababab;

    var payload = new Payload();
    payload.setBody('0'.repeat(271828));

    req.setPayload(payload);
    req.setResponseSize(size);

    var call = testService.unaryCall(
      req,
      {
        [ECHO_INITIAL_KEY]: ECHO_INITIAL_VALUE,
        [ECHO_TRAILING_KEY]: ECHO_TRAILING_VALUE,
      },
      (err, response) => {
        assert.ifError(err);
        assert.equal(response.getPayload().getBody().length, size);
        done();
      }
    );

    call.on('metadata', (metadata) => {
      assert(ECHO_INITIAL_KEY in metadata);
      assert.equal(metadata[ECHO_INITIAL_KEY], ECHO_INITIAL_VALUE);
      done();
    });

    call.on('status', (status) => {
      assert('metadata' in status);
      assert(ECHO_TRAILING_KEY in status.metadata);
      assert.equal(status.metadata[ECHO_TRAILING_KEY], ECHO_TRAILING_VALUE);
      done();
    });
  }

  function doStatusCodeAndMessage(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);
    var req = new SimpleRequest();

    const TEST_STATUS_MESSAGE = 'test status message';
    const echoStatus = new EchoStatus();
    echoStatus.setCode(2);
    echoStatus.setMessage(TEST_STATUS_MESSAGE);

    req.setResponseStatus(echoStatus);

    testService.unaryCall(req, {}, (err, response) => {
      assert(err);
      assert('code' in err);
      assert('message' in err);
      assert.equal(err.code, 2);
      assert.equal(err.message, TEST_STATUS_MESSAGE);
      done();
    });
  }

  function doUnimplementedMethod(done) {
    var testService = new TestServiceClient(SERVER_HOST, null, null);
    testService.unimplementedCall(new Empty(), {}, (err, response) => {
      assert(err);
      assert('code' in err);
      assert.equal(err.code, 12);
      done();
    });
  }

  var testCases = {
    empty_unary: { testFunc: doEmptyUnary },
    empty_unary_with_deadline: { testFunc: doEmptyUnaryWithDeadline },
    large_unary: { testFunc: doLargeUnary },
    server_streaming: { testFunc: doServerStreaming, skipBinaryMode: true },
    custom_metadata: { testFunc: doCustomMetadata },
    status_code_and_message: { testFunc: doStatusCodeAndMessage },
    unimplemented_method: { testFunc: doUnimplementedMethod },
  };

  return testCases;
};

let proxyServer, grpcServer;

beforeAll((done) => {
  proxyServer = proxy({
    target: `http://localhost:${ports.grpc}`,
  }).listen(ports.proxy, async () => {
    grpcServer = await startGrpcServer({ port: ports.grpc });
    done();
  });
});

afterAll((done) => {
  proxyServer.close(() => {
    grpcServer.tryShutdown(done);
  });
});

describe('grpc-web-text interop tests', function () {
  const testCases = getTestCases(clients.text);
  Object.keys(testCases).forEach((testCase) => {
    test('should pass ' + testCase, testCases[testCase].testFunc);
  });
});

describe('grpc-web interop tests', function () {
  const testCases = getTestCases(clients.binary);
  Object.keys(testCases).forEach((testCase) => {
    if (testCases[testCase].skipBinaryMode) {
      return;
    }
    test('should pass ' + testCase, testCases[testCase].testFunc);
  });
});
