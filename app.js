const sbs1 = require('sbs1')
const nconf = require('nconf')
const bunyan = require('bunyan')
const mqtt = require('mqtt')

const aircraftDb = require('./lib/aircraftDB')

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
log.info('ADSB2MQTT starting')

const mqttClient = mqtt.connect(nconf.get('mqtt:uri'))
mqttClient.on('connect', function () {
  log.info({ event: 'mqtt_connect' })
  const adsbClient = sbs1.createClient({
    host: nconf.get('modes:host'),
    port: nconf.get('modes:port')
  })
  adsbClient.on('message', function (msg) {
    if (msg.message_type === sbs1.MessageType.TRANSMISSION) {
      aircraftDb.applyMessage(msg)
      const aircraft = aircraftDb.getAircraft(msg.hex_ident)
      if (aircraft.isNew) {
        mqttClient.publish(`${recieverId}/new_aircraft`, aircraft.callsign, mqttPublishOptions)
        aircraftDb.markSeen(aircraft)
      }
      if (aircraft.callsign) {
        if (msg.altitude !== null && msg.altitude !== undefined) {
          log.debug({ event: 'altitude', callsign: aircraft.callsign, altitude: aircraft.altitude })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/altitude`, aircraft.altitude.toString(), mqttPublishOptions)
        }
        if (msg.lat !== null || msg.lon !== null) {
          log.debug({ event: 'position', callsign: aircraft.callsign, lat: aircraft.lat, lon: aircraft.lon })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/position`, JSON.stringify({ lat: aircraft.lat, long: aircraft.lon }), mqttPublishOptions)
        }
        if (msg.is_on_ground !== null) {
          log.debug({ event: 'on_ground', callsign: aircraft.callsign, onground: aircraft.is_on_ground })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/onground`, aircraft.is_on_ground ? 'ground' : 'air', mqttPublishOptions)
        }
        if (msg.track !== null) {
          log.debug({ event: 'track_angle', callsign: aircraft.callsign, track_angle: aircraft.track })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/track`, aircraft.track.toString(), mqttPublishOptions)
        }
        if (msg.ground_speed !== null) {
          log.debug({ event: 'ground_speed', callsign: aircraft.callsign, ground_speed: aircraft.ground_speed })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/ground_speed`, aircraft.ground_speed.toString(), mqttPublishOptions)
        }
        if (msg.emergency !== null) {
          log.debug({ event: 'emergency', callsign: aircraft.callsign, emergency: msg.emergency })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/emergency`, aircraft.emergency ? 'yes' : 'no', mqttPublishOptions)
        }
        if (msg.squawk !== null) {
          log.debug({ event: 'squawk', callsign: aircraft.callsign, squawk: msg.squawk })
          mqttClient.publish(`${recieverId}/aircraft/${aircraft.callsign}/squawk`, aircraft.squawk, mqttPublishOptions)
        }
      }
    }
  })
})

setInterval(function () {
  const allAircraft = aircraftDb.getAllAircraft()
  log.info({ event: 'stats', totalAircraft: Object.keys(allAircraft).length })
}, 5000)
