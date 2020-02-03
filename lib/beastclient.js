const net = require('net')
const readline = require('readline')
const events = require('events')
const util = require('util')

exports.createClient = function (options) {
  const client = new exports.Client(options)
  return client
}

exports.Client = function (options) {
  options = options || {}
  var host = options.host || 'localhost'
  var port = options.port || 30002
  this.socket = net.connect(
    {
      host: host,
      port: port
    })
  this.socket_rl = readline.createInterface({
    input: this.socket,
    output: '/dev/null'
  })
  this.socket_rl.on('line', this.parseMessage_.bind(this))
}
util.inherits(exports.Client, events.EventEmitter)

exports.Client.prototype.parseMessage_ = function (line) {
  const msg = unpackBeastString(line)
  this.emit('message', msg)
}

const fromHexString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

function unpackBeastString (input) {
  if (input.match(/^\*.*;$/g)) {
    const bytesAsString = input.substr(1, input.length - 2)
    return fromHexString(bytesAsString)
  } else {
    console.log('bad ' + input)
  }
}
