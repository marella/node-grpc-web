const console = require('node:console');
const process = require('node:process');

const cli = (args = []) => {
  jest.replaceProperty(process, 'argv', [null, null, ...args]);
  return require('../src/cli.js');
};

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('cli errors', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error');
    jest.spyOn(process, 'exit').mockImplementationOnce(() => {
      throw new Error('process.exit()');
    });
  });

  test('should exit when --target is missing', () => {
    expect(() => cli(['--listen', 'port'])).toThrow('process.exit()');
    expect(console.error).toBeCalledWith(expect.stringContaining('--target'));
    expect(process.exit).toBeCalledWith(1);
  });

  test('should exit when --listen is missing', () => {
    expect(() => cli(['--target', 'address'])).toThrow('process.exit()');
    expect(console.error).toBeCalledWith(expect.stringContaining('--listen'));
    expect(process.exit).toBeCalledWith(1);
  });
});

test('should pass options', () => {
  const listen = jest.fn();
  const mockProxy = jest.fn(() => ({ listen }));
  jest.mock('../src/index.js', () => mockProxy);

  cli([
    '--target',
    'address',
    '--listen',
    'port',
    '--origin',
    'foo',
    '--headers',
    'bar,baz',
  ]);

  expect(mockProxy).toBeCalledWith(
    expect.objectContaining({
      target: 'address',
      origin: 'foo',
      headers: 'bar,baz',
    })
  );
  expect(listen).toBeCalledWith('port');
});
