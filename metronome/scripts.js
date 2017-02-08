"use strict";

function BufferLoader(context, urlList, callback) {
	this.context = context;
	this.urlList = urlList;
	this.onload = callback;
	this.bufferList = new Array();
	this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
	// Load buffer asynchronously
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.responseType = "arraybuffer";

	var loader = this;

	request.onload = function() {
		// Asynchronously decode the audio file data in request.response
		loader.context.decodeAudioData(
				request.response,
				function(buffer) {
					if (!buffer) {
						alert('error decoding file data: ' + url);
						return;
					}
					loader.bufferList[index] = buffer;
					if (++loader.loadCount == loader.urlList.length)
						loader.onload(loader.bufferList);
				},
				function(error) {
					console.error('decodeAudioData error', error);
				}
				);
	}

	request.onerror = function() {
		alert('BufferLoader: XHR error');
	}

	request.send();
}

BufferLoader.prototype.load = function() {
	  for (var i = 0; i < this.urlList.length; ++i)
			  this.loadBuffer(this.urlList[i], i);
}



$(document).ready(function() {
	var DEBUG = true;

	var bardebug = function( val ) {
		if( DEBUG === true ) {
			console.log( val );
		}
	}

	var BarModel = Backbone.Model.extend({
		defaults: {
			"bpm":  60,
			"meter": 4,
			"isMuted": false,
			"dirty": false, // Indicates whether the speed or meter has changed
			"bpmMax": 240,
			"bpmMin": 30,
		},

		_intervalId: null,
		_currentBeat: 1,

		initialize: function() {
			this.updateInterval();
		},

		updateInterval: function() {
			this.clearInterval();
			var intervalInMs = Math.round( (1000 * 60) / this.get('bpm') );
			this._intervalId = window.setInterval( this.onInterval.bind(this), intervalInMs );
			this.onInterval.call(this);

			console.log( "timer will fire every " + intervalInMs + "ms");
		},

		clearInterval: function() {
			window.clearInterval( this._intervalId );
		},

		onInterval: function() {
			if( this.get('dirty') === true ) {
				this.set('dirty', false, { silent: true });
				this.updateInterval();

				console.log("Updated settings before tick");
				return false
			}

			var evtArgs = { accent: false };
			if( this._currentBeat === 1 ) {
				evtArgs.accent = true;
				this.trigger("BEAT_FIRST");
			}

			this.trigger("BEAT", evtArgs);



			if(this._currentBeat == this.get('meter') ) {
			this.trigger("BEAT_LAST");
				this._currentBeat = 1;
			} else {
				this._currentBeat += 1;
			}
		},

		mute: function() {
			this.set('isMuted', true);
		},

		unMute: function() {
			this.set('isMuted', false);
		},

		setMeter: function( meter ) {
			if( typeof meter == 'number') {
				this.set({
					meter: meter,
					dirty: true,
				});
				bardebug( "Updated meter to " + this.get('meter') );
			}

			return this.get('meter')
		},

		setBpm: function( speed ) {
			if( typeof speed == 'number') {
				if( speed > this.get('bpmMin') && speed < this.get('bpmMax') ) {
					this.set({
						bpm: speed,
						dirty: true
					});
				}
			}

			return this.get('bpm');
		},

		incBpm: function() {
			var speed = this.get('bpm');
			this.setBpm( speed + 1 );
		},
		decBpm: function() {
			var speed = this.get('bpm');
			this.setBpm( speed - 1 );
		},
		incMeter: function() {
			var meter = this.get('meter');
			this.setMeter( meter + 1 );
		},
		decMeter: function() {
			var meter = this.get('meter');
			this.setMeter( meter - 1 );
		},
	});

	var SpeedTrainer = Backbone.Model.extend({
		defaults: {
			from: 60,
			to: 100,
			currentSpeed: null,
			stepSize: 5,
			increaseAfter: 4, // bars
			currentBar: 1,
		},

		initialize: function(options) {
			this.metronome = options.metronome;
		},

		onBeatLast: function() {
			console.log("Current Bar: " + this.get('currentBar'));
			console.log("Current Speed: " + this.get('currentSpeed'));

			var bar = this.get('currentBar');
			if( bar >= this.get('increaseAfter')) {
				var newBpm = this.get('currentSpeed') + this.get('stepSize');
				var maxBpm = this.get('to');

				if(newBpm > maxBpm) {
					newBpm = maxBpm;
				}

				this.metronome.setBpm( newBpm );
				this.set( 'currentSpeed', newBpm );
				this.set( 'currentBar', 1 );
			} else {
				this.set('currentBar', bar + 1 );
			}
		},

		onBeat: function() {
		},

		start: function() {
			this.metronome.on("BEAT_LAST", this.onBeatLast.bind(this));
			this.metronome.on("BEAT", this.onBeat);
			this.set('currentSpeed', this.get('from'));
			this.metronome.setBpm( this.get('currentSpeed') );
		},

		stop: function() {
			this.metronome.off("BEAT_LAST", this.onBeatLast);
			this.metronome.off("BEAT", this.onBeat);
		},

	});

	var MetronomeView = Backbone.View.extend({
		el: '#root',
		template: _.template( $('#metronome').html() ),

		events: {
			'input #js-input-bpm': 'onInputBpm',
			'click #js-increment-bpm': 'onIncrementBpm',
			'click #js-decrement-bpm': 'onDecrementBpm',

			'input #js-input-meter': 'onInputMeter',
			'click #js-increment-meter': 'onIncrementMeter',
			'click #js-decrement-meter': 'onDecrementMeter',
		},

		initialize: function() {
			//this.speedTrainer = new SpeedTrainer({ metronome: this.model });
			//this.speedTrainerView = new SpeedTrainerView({ model: this.speedTrainer });

			this.prepareAudio.call(this);

			// this.model.on('BEAT', this.render.bind(this));
			this.render();
			this.model.on('BEAT', this.playSound.bind(this));
			this.model.on('change', this.render.bind(this));

			this.$inputBpm = this.$('#js-input-bpm');
			this.$incBpm = this.$('#js-increment-bpm');
			this.$decBpm = this.$('#js-decrement-bpm');
			this.$inputMeter = this.$('#js-input-meter');
			this.$incMeter = this.$('#js-increment-meter');
			this.$decMeter = this.$('#js-decrement-meter');
		},

		onInputBpm: function(evt) {
			var val = parseInt( evt.target.value, 10);
			this.model.setBpm( val );
		},

		onIncrementBpm: function(evt) { this.model.incBpm(); },
		onDecrementBpm: function(evt) { this.model.decBpm(); },

		onInputMeter: function(evt) {
			var val = parseInt( evt.target.value, 10);
			this.model.setMeter( val );
		},
		onIncrementMeter: function(evt) { this.model.incMeter(); },
		onDecrementMeter: function(evt) { this.model.decMeter(); },
// 		onIncrementBpm: function(evt) {
// 			var el = this.$inputBpm;
// 		}
//
// 		updateInputValue: function(el, operation) {
// 			var val = parseInt(el.val(), 10);
// 			if(operation === 'INC') {
// 				input.val = val++;
// 			} else if(operation === 'DEC') {
// 				input.val = val--;
// 			} else {
// 				console.error("Invalid Operation", operation);
// 			}
// 		},

		prepareAudio: function() {
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			this.audioCtx = new AudioContext();
			var bufferLoader = new BufferLoader( this.audioCtx, ['4d.wav'], this.finishedLoading.bind(this) );
			bufferLoader.load();
		},

		finishedLoading: function(bufferList) {
			this.bufferList = bufferList;
		},

		playSound: function(evt) {
			var gainNode = this.audioCtx.createGain();
			var clickSound = this.audioCtx.createBufferSource();

			clickSound.buffer = this.bufferList[0];
			clickSound.connect(this.audioCtx.destination);
			clickSound.connect( gainNode );
			gainNode.connect(this.audioCtx.destination);


			if(evt && evt.accent === true ) {
				gainNode.gain.value = 1;
			}
		 	else {
				gainNode.gain.value = .3;
			}

			clickSound.start( 0 );
		},

		render: function() {
			this.$el.html(this.template( this.model.attributes ));
			// this.$('.speed-trainer-node').html( this.speedTrainerView.render().el );

			return this
		}

	});

	var SpeedTrainerView = Backbone.View.extend({
		template: _.template( $('#speed-trainer').html() ),

		render: function() {
			this.$el.html(this.template( this.model.attributes ));

			return this
		}

	});


	var barModel = new BarModel();
	window.barModel = barModel;
	var rootView = new MetronomeView( { model: barModel });
});

