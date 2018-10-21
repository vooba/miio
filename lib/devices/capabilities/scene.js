'use strict';

const { Thing, State } = require('abstract-things');
const { boolean } = require('abstract-things/values');

const MiioApi = require('node-red-contrib-xiaomi-miio/node_modules/miio/lib/device');

module.exports = Thing.mixin(Parent => class extends Parent.with(State) {
	static get capability() {
		return 'miio:scene';
	}

	static availableAPI(builder) {
		builder.event('sceneChanged')
			.type('number')
			.description('Scene state has changed')
			.done();

		builder.action('scene')
			.description('Get or set a scene')
			.argument('number', true, 'Scene number')
			.returns('number', 'The current scene')
			.done();

		builder.action('setScene')
			.description('Set a scene')
			.argument('number', false, 'Scene number')
			.returns('number', 'If the buzzer is on')
			.done();

		builder.action('getScene')
			.description('Get the current scene')
			.returns('boolean', 'The current scene')
			.done();
	}

	propertyUpdated(key, value) {
		if(key === 'scene') {
			if(this.updateState('scene', value)) {
				this.emitEvent('sceneChanged', value);
			}
		}

		super.propertyUpdated(key, value);
	}

	/**
	 * Get or set if a scene.
	 *
	 */
	scene(number) {
		if(typeof number === 'undefined') {
			return this.getScene();
		}

		return this.setScene(number);
	}

	getScene() {
		return this.getState('scene');
	}

	setScene(n) {
		n = parseInt(n);

		return this.changeScene(n)
			.then(() => this.getScene());
	}

	changeScene(number) {
		return this.call('apply_fixed_scene', [ number ], {
			refresh: [ 'scene' ]
		})
			.then(MiioApi.checkOk);
	}
});
