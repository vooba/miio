'use strict';

const { LightBulb, ColorTemperature } = require('abstract-things/lights');
const { color } = require('abstract-things/values');
const MiioApi = require('../device');

const Power = require('./capabilities/power');
const Dimmable = require('./capabilities/dimmable');
const Colorable = require('./capabilities/colorable');
const Scene = require('./capabilities/scene');

const MIN_TEMP = 1700;
const MAX_TEMP = 6500;

module.exports = class MoonLight extends LightBulb
	.with(MiioApi, Power, Dimmable, Colorable, ColorTemperature, Scene)
{
	static get type() {
		return 'miio:philips-light-moonlight';
	}

	constructor(options) {
		super(options);

		this.defineProperty('power', {
			name: 'power',
			mapper: v => v === 'on'
		});

		this.defineProperty('bright', {
			name: 'brightness',
			mapper: parseInt
		});

		this.defineProperty('cct', {
			name: 'colorTemperature',
			mapper: v => {
				v = parseInt(v);
				return color.temperature(MIN_TEMP + (v / 100) * (MAX_TEMP - MIN_TEMP));
			}
		});

		this.updateColorTemperatureRange(MIN_TEMP, MAX_TEMP);

		this.defineProperty('rgb', {
			name: 'colorRGB',
			mapper: rgb => {
				rgb = parseInt(rgb);

				return color.rgb((rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff);
			}
		});

		// Query for the color mode
		this.defineProperty('color_mode', {
			name: 'colorMode',
			mapper: v => {
				v = parseInt(v);
				switch(v) {
					case 1:
						return 'rgb';
					case 2:
						return 'colorTemperature';
					case 3:
						return 'hsv';
				}
			}
		});

		this.defineProperty('snm', {
			name: 'scene',
			mapper: parseInt
		});
	}

	changePower(power) {
		return this.call('set_power', [ power ? 'on' : 'off' ], {
			refresh: [ 'power' ]
		}).then(MiioApi.checkOk);
	}

	changeBrightness(brightness) {
		return this.call('set_bright', [ brightness ], {
			refresh: [ 'brightness' ]
		}).then(MiioApi.checkOk);
	}

	changeColor(color, duration) {

		if(color.is('temperature')) {
			// The user has request a color via temperature

			const kelvins = color.temperature.kelvins;
			let temp;
			if(kelvins <= MIN_TEMP) {
				temp = 1;
			} else if(kelvins >= MAX_TEMP) {
				temp = 100;
			} else {
				temp = Math.round((kelvins - MIN_TEMP) / (MAX_TEMP - MIN_TEMP) * 100);
			}

			return this.call('set_cct', [temp], {
				refresh: [ 'colorTemperature' ]
			}).then(MiioApi.checkOk);
		} else {

			return this.call('set_rgb', [color.red, color.green, color.blue] , {
				refresh: [ 'colorRGB' ]
			}).then(MiioApi.checkOk);
		}

	}

	propertyUpdated(key, value) {
		if(key === 'colorTemperature' || key === 'colorRGB') {
			let currentColor = this.color();
			switch(key) {
				case 'colorTemperature':
					// Currently using color temperature mode, parse as temperature
					currentColor = color.temperature(this.property('colorTemperature'));
					break;
				case 'colorRGB': {
					// Using RGB, parse if we have gotten the RGB value
					let rgb = this.property('colorRGB');
					if(rgb) {
						currentColor = color.rgb(rgb.red, rgb.green, rgb.blue);
					}
					break;
				}
			}

			this.updateColor(currentColor);
		}

		super.propertyUpdated(key, value);
	}

	changeScene(number) {

		if(number < 1 || number > 6)
			return Promise.reject(new Error('Invalid scene: ' + number));

		if(number == 6){
			return this.call('go_night', [ ], {
				refresh: [ 'scene' ]
			})
				.then(MiioApi.checkOk);
		} else {
			return this.call('apply_fixed_scene', [ number ], {
				refresh: [ 'scene' ]
			})
				.then(MiioApi.checkOk);
		}
	}

};

/**
 *  Currently not implemented
 *
 * 	add_mb                          # Add miband
 *  get_band_period                 # Bracelet work time
 *  get_mb_rssi                     # Miband RSSI
 *  get_mb_mac                      # Miband MAC address
 *  enable_mibs
 *  set_band_period
 *  miIO.bleStartSearchBand
 *  miIO.bleGetNearbyBandList
 *  enable_sub_voice                # Sub voice control?
 *  enable_voice                    # Voice control
 *  skip_breath
 *  set_sleep_time					# Sleep time in minutes
 *  set_wakeup_time					# Wakeup light -> [hour 0-23, minute 0-59 , binary coded weekday 1bit Monday, 2bit Tuesday ...] eg. 3 = Monday and Tuesday
 *  en_sleep
 *  en_wakeup
 *  go_night                        # Night light / read mode
 *  get_wakeup_time
 *  enable_bl                       # Night light
 *
 *  apply_fixed_scene				# 6 fixed sceens 1: Forrest Bathing  2: Pink Romance  3: Sunset Glow  4: Ocean and Sky  5: Screen Reading (6: Midnight -> command go_night)
 *  set_brirgb						# Set brightness and RGB
 *  set_bricct						# Set brightness and color temperature
 */
