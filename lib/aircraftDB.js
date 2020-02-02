const _aircraftDatabase = {}

module.exports = {
  markSeen: function (aircraft) {
    _aircraftDatabase[aircraft.hex_ident].isNew = false
  },
  applyMessage: function (msg) {
    const aircraftKey = msg.hex_ident
    if (aircraftKey === null || aircraftKey === undefined) {
      throw new Error('No hex ID for aircraft ' + JSON.stringify(msg))
    }
    let aircraft = {}
    if (_aircraftDatabase[aircraftKey] === undefined) {
      _aircraftDatabase[aircraftKey] = {}
      aircraft.isNew = true
    } else {
      aircraft = _aircraftDatabase[aircraftKey]
    }
    const fields = [
      'session_id',
      'flight_id',
      'hex_ident',
      'callsign',
      'altitude',
      'ground_speed',
      'track',
      'lat',
      'lon',
      'vertical_rate',
      'squawk',
      'emergency',
      'spi',
      'is_on_ground',
      'generated_date',
      'generated_time',
      'logged_date',
      'logged_time'
    ]
    fields.forEach(function (field) {
      if (msg[field]) {
        aircraft[field] = msg[field]
      }
    })
    _aircraftDatabase[aircraftKey] = aircraft
  },
  getAircraft: function (aircraftId) {
    if (_aircraftDatabase[aircraftId] !== undefined) {
      return _aircraftDatabase[aircraftId]
    } else {
      throw new Error('Aircraft has not been seen yet')
    }
  },
  getAllAircraft: function () {
    return _aircraftDatabase
  },
  prune: function () {
    Object.keys(_aircraftDatabase).forEach(function (key) {
      const aircraft = _aircraftDatabase[key]
      console.log(`id: ${key} ${aircraft.generated_date} ${aircraft.generated_time}`)
    })
  }
}
