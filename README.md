# 🛫 ADS-B to MQTT 🛬
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
ADS-B is the system aircraft use to broadcast their position via digital radio signals, rather that relying on radar.  Since this signal is broadcast, and is unencrypted, it can be recieved by anyone with a suitable radio reciever and used to display the position of aeroplanes within reception range.

It is possible to [recieve these signals](https://www.satsignal.eu/raspberry-pi/dump1090.html) relatively easily and cheaply using a RTL-SDR dongle and a Raspberry Pi.  You can then send on the data to various flight tracking apps like [flightradar24](https://www.flightradar24.com/build-your-own), [FlightAware](https://flightaware.com/adsb/) and others.

The program often used to do this, dump1090, outputs a stream of messages on port 30003, which can be parsed to get retrieve the information of each aeroplane's broadcast.

This app decodes that stream of messages and converts them into MQTT messages which are arranged by aircraft and flight number - allowing you to build applications that subscribe to updates from specific aircraft or flight numbers using a MQTT broker.

## Requirements

You will need a host which you can connect to with an RTL-SDR USB stick, running [dump1090](https://github.com/antirez/dump1090) or similar, and can be connected to and recieve a SBS-1 compatible serial stream.

You'll also want a machine that's running the Docker Daemon to run it on.

## Running

The easiest way to run this application is using `docker-compose`.

For testing purposes, clone this repo and copy the `docker-compose-example.yml` file, and customise for your purposes:

    version: '3.7'

    services:
        adsb2mqtt:
            build: .
            environment:
                mqtt__uri: mqtt://mqtt
                modes__host: your-host-running-dump1090
                modes__port: 30003
        mqtt:
            image: eclipse-mosquitto
            ports:
              - 1883:1883

Modify the `modes__host` and optionally `modes__port` to suit your requirements.

You will find that on port 1883 there is a MQTT broker which you can connect to.

## Configuration

All configuration is by environment variables.

### **REQUIRED** `mqtt__uri`
The URI of the MQTT broker to connect to.  May include usernames/passwords as required.

### **REQUIRED** `modes__host`
The hostname of the recieving client to connect to for SBS-1 format messages

### `modes__port`
**Default**: 30003
The TCP port to connect to for SBS-1 format messages

### `reciever_id`
**Default**: 'asdb2mqtt'
Allows you to have multiple recievers using a single MQTT broker - prefixes the MQTT topics (as below) with the reciever ID.


## Topic structure

In order to make it straightforward to track aircraft, topics are arranged according to [HiveMQ's best practices](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/).

### `adsb2mqtt/new_aircraft`
Messages are sent to this topic when new aircraft have been spotted for the first time.  The aircraft callsign is sent as a string (which can then be used to look up further information in the aircraft topic)

### `adsb2mqtt/aircraft`
The top level topic for all aircraft

### `adsb2mqtt/aircraft/$callsign`
Each aircraft has a subtopic including it's callsign, under which all information about that particular aircraft is published.

### `adsb2mqtt/aircraft/$callsign/position`
The position of the aircraft, in JSON format.  e.g.
```
{
  "lat": 51.16145,
  "long": -0.09375
}
```
### `adsb2mqtt/aircraft/$callsign/altitude`
The altitude in feet, calculated from pressure, relative to 1013.2 mb (sea level)

### `adsb2mqtt/aircraft/$callsign/ground_speed`
As the [documentation](http://woodair.net/SBS/Article/Barebones42_Socket_Data.htm) says, "speed over ground". Probably [knots](https://en.wikipedia.org/wiki/Knot_(unit)), but I'm not entirely sure.

### `adsb2mqtt/aircraft/$callsign/squawk`
The [transponder code](https://en.wikipedia.org/wiki/Transponder_(aeronautics)) the aircraft currently has set.  Hopefully, it's not 7700, 7600 or 7500. This one of the codes that appear on Air Traffic Control radar screens to identify each aircraft.

### `adsb2mqtt/aircraft/$callsign/emergency`
Whether the aircraft is encountering an emergency (closely related to squawking 7700)

### `adsb2mqtt/aircraft/$callsign/track`
The [ground track](https://en.wikipedia.org/wiki/Ground_track) angle.

### `adsb2mqtt/aircraft/$callsign/onground`
Whether the aircraft has the "ground squat" switch has been activated.  This switch activates when the weight of the aircraft is on the landing gear - i.e. it has landed and is on the ground.  It prevents the landing gear from being retracted when the aircraft is not airbourne. For more information see the [FAA flying handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_flying_handbook.pdf) page 2-8.

This topic can have either `air` or `ground` published to it to indicate this status.

**Note**: If your reciever is not very high up, or very close to an airport, you probably won't always see these go from `air` to `ground` as aircraft land

## License

MIT License

Copyright (c) 2020 Chris Roberts

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
