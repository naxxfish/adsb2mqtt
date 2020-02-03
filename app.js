const nconf = require('nconf')
const bunyan = require('bunyan')
const mqtt = require('mqtt')
const AircraftStore = require('mode-s-aircraft-store')
const Decoder = require('mode-s-decoder')

const BeastClient = require('./lib/beastclient')
const decoder = new Decoder()

nconf.env('__').file('./config/defaults.json').required([
  'modes:host',
  'mqtt:uri'
])
const recieverId = nconf.get('reciever_id')
const log = bunyan.createLogger({ name: 'adsb2mqtt', level: 'info' })

const mqttPublishOptions = {
  properties: {
    messageExpiryInterval: 300
  }
}
log.info({ msg: 'ADSB2MQTT starting', recieverId })

const aircraftStore = new AircraftStore({
  timeout: nconf.get('timeout')
})

const mqttClient = mqtt.connect(nconf.get('mqtt:uri'))

mqttClient.on('connect', function () {
  log.info({ event: 'mqtt_connect' })
  const adsbClient = BeastClient.createClient({
    host: nconf.get('modes:host'),
    port: nconf.get('modes:port')
  })
  adsbClient.on('message', function (msg) {
    const decodedMsg = decoder.parse(msg)
    aircraftStore.addMessage(decodedMsg)
  })
})

setInterval(function () {
  const allAircraft = aircraftStore.getAircrafts()
  log.info({ event: 'stats', totalAircraft: allAircraft.length })
  allAircraft.forEach(function (aircraft) {
    if (aircraft.callsign) {
      if (aircraft.altitude !== null && aircraft.altitude !== undefined) {
        log.debug({ event: 'altitude', callsign: aircraft.callsign, altitude: aircraft.altitude })
        mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/altitude`, JSON.stringify(aircraft.altitude), mqttPublishOptions)
      }
      if (aircraft.lat !== null || aircraft.lng !== null) {
        log.debug({ event: 'position', callsign: aircraft.callsign, lat: aircraft.lat, lon: aircraft.lng })
        mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/position`, JSON.stringify({ lat: aircraft.lat, long: aircraft.lng }), mqttPublishOptions)
      }
      if (aircraft.speed !== null) {
        log.debug({ event: 'ground_speed', callsign: aircraft.callsign, speed: aircraft.speed })
        mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/speed`, JSON.stringify(aircraft.speed), mqttPublishOptions)
      }
      if (aircraft.heading !== null) {
        log.debug({ event: 'heading', callsign: aircraft.callsign, heading: aircraft.heading })
        mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/heading`, JSON.stringify(aircraft.heading), mqttPublishOptions)
      }
      if (aircraft.count !== null) {
        log.debug({ event: 'message_count', callsign: aircraft.callsign, count: aircraft.count })
        mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/msg_count`, JSON.stringify(aircraft.count), mqttPublishOptions)
      }
    }
  })
}, nconf.get('updaterate'))
