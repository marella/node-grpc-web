#!/usr/bin/env node

const console = require('node:console');
const process = require('node:process');
const parseArgs = require('minimist');
const proxy = require('./index.js');

const die = (message) => {
  console.error(message);
  process.exit(1);
};

const options = parseArgs(process.argv.slice(2));
if (!options.target) {
  die('Please specify the gRPC server address. --target <address>.');
}
if (!options.listen) {
  die('Please specify a port for the proxy server. --listen <number>');
}

proxy(options).listen(options.listen);
