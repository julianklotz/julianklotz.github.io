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
			"bpm":  120,
			"meter": 4,
			"isMuted": false,
			"dirty": false, // Indicates whether the speed or meter has changed
			"bpmMax": 240,
			"bpmMin": 30,
		},

		_lookahead: 25.0,
		_currentBeat: 1,
		_scheduleAheadTime: 0.1, // scheduling ahead, in seconds
		_bufferList: null,
		_nextNoteTime: null,
		_quarterNoteCount: 0,


		audioCtx: null,

		initialize: function(options) {
			this._timer = new Worker("metronomeworker.js");
			this._timer.postMessage({ "interval": this._lookahead });
			this._timer.onmessage = this.onTimerMessage.bind(this);

			this.initAudioContext();

			this.on('change:isMuted', this.onMuteChange);
			this.onMuteChange();
		},

		onTimerMessage: function(e) {
			if (e.data == "tick") {
				this.scheduler();
			}
		},

		scheduler: function() {
			while( this._nextNoteTime < this.audioCtx.currentTime + this._scheduleAheadTime) {
        	this.schedulePlayback(this._nextNoteTime);
				  this.nextPlayback();
			}
		},

		nextPlayback: function() {
			var dur = this.getBeatDuration(); // seconds
			this._nextNoteTime = this._nextNoteTime + dur;
		},

		schedulePlayback: function( time ) {
			this._quarterNoteCount++;

			var gainNode = this.audioCtx.createGain();
			var clickSound = this.audioCtx.createBufferSource();


			if(!this._bufferList) {
				console.error('Couldn’t load audio files');
				return
			}

			clickSound.buffer = this._bufferList[0];
			clickSound.connect(this.audioCtx.destination);
			clickSound.connect( gainNode );
			gainNode.connect(this.audioCtx.destination);

			var accent = (this._quarterNoteCount === 1) ? true : false;

			if(accent === true ) {
				gainNode.gain.value = 1;
			}
		 	else {
				gainNode.gain.value = .1;
			}

			console.log( "Scheduled Time", time);
			clickSound.start( time );

			if(this._quarterNoteCount >= this.get( 'meter' ) ) {
				this._quarterNoteCount = 0;
			}

		},

		initAudioContext: function() {
			window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

			if(!window.AudioContext) {
				alert("Sorry, your browser does not support playing sound using the Web Audio API.");
			}

			this.audioCtx = new AudioContext();
			var bufferLoader = new BufferLoader( this.audioCtx, ['4d.wav'], this.finishedLoading.bind(this) );
			bufferLoader.load();
		},

		finishedLoading: function(bufferList) {
			this._bufferList = bufferList;
		},


		onMuteChange: function() {
			if(this.get('isMuted') === false ) {
				this._timer.postMessage('start');
				this._nextNoteTime = this.audioCtx.currentTime;
			} else {
				this._timer.postMessage('stop');
				this.clearInterval();
			}
		},

		toggleMute: function() {
			this.set('isMuted', !this.get('isMuted'));
		},

		isMuted: function() {
			return this.get('isMuted')
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


		getBeatDuration: function() {
			var bpm = this.get('bpm');
			var intervalInS = 60.0 / bpm;
			return intervalInS
		},

		getBarDuration: function() {
			var duration = this.getBeatDuration() * 2 * this.get('meter');
			return duration
		},
	});

	var SpeedTrainer = Backbone.Model.extend({
		defaults: {
			from: 120,
			to: 140,
			currentSpeed: null,
			stepSize: 10,
			increaseAfter: 4, // bars
			currentBar: 1,
			isRunning: false,
		},

		initialize: function(options) {
			this.metronome = options.metronome;
			_.bindAll(this, 'onBeatLast');

		},

		toggleTrainer: function() {
			var isRunning = this.get('isRunning');

			if( isRunning === true ) {
				this.stop();
			} else {
				this.start();
			}
		},


		onBeatLast: function() {
			var bar = this.get('currentBar');
			if( bar >= this.get('increaseAfter')) {
				var newBpm = this.get('currentSpeed') + this.get('stepSize');
				var maxBpm = this.get('to');

				if(newBpm === maxBpm) {
					this.stop();
				}

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
			this.metronome.on("BEAT_LAST", this.onBeatLast);
			this.metronome.on("BEAT", this.onBeat);
			this.set({ 'isRunning': true, 'currentSpeed': this.get('from')} );
			this.metronome.setBpm( this.get('currentSpeed') );
		},

		stop: function() {
			console.log('-- STOP --');
			this.set( 'isRunning', false );
			this.metronome.off("BEAT_LAST", this.onBeatLast);
			this.metronome.off("BEAT", this.onBeat);
		},

	});

	var MetronomeView = Backbone.View.extend({
		className: 'wrap-center',
		el: '#root',
		template: _.template( $('#metronome').html() ),

		events: {
			'click #js-btn-mute': 'onMute',
			'touchend #js-btn-mute': 'onMute',

			'input #js-input-bpm': 'onInputBpm',
			'click #js-increment-bpm': 'onIncrementBpm',
			'click #js-decrement-bpm': 'onDecrementBpm',

			'input #js-input-meter': 'onInputMeter',
			'click #js-increment-meter': 'onIncrementMeter',
			'click #js-decrement-meter': 'onDecrementMeter',

		},

		initialize: function() {
			this.speedTrainer = new SpeedTrainer({ metronome: this.model });
			this.speedTrainerView = new SpeedTrainerView({ model: this.speedTrainer });


			this.render();
			// this.model.on('BEAT', this.playSound.bind(this));
			this.model.on('change', this.render.bind(this));

			this.$inputBpm = this.$('#js-input-bpm');
			this.$incBpm = this.$('#js-increment-bpm');
			this.$decBpm = this.$('#js-decrement-bpm');
			this.$inputMeter = this.$('#js-input-meter');
			this.$incMeter = this.$('#js-increment-meter');
			this.$decMeter = this.$('#js-decrement-meter');
		},

		onMute: function(evt) {
			evt.preventDefault();
			this.model.toggleMute();
		},

		onInputBpm: function(evt) {
			var val = parseInt( evt.target.value, 10);
			this.model.setBpm( val );
		},

		onInputMeter: function(evt) {
			var val = parseInt( evt.target.value, 10);
			this.model.setMeter( val );
		},

		onIncrementBpm: function(evt) { this.model.incBpm(); },
		onDecrementBpm: function(evt) { this.model.decBpm(); },
		onIncrementMeter: function(evt) { this.model.incMeter(); },
		onDecrementMeter: function(evt) { this.model.decMeter(); },




		render: function() {


			var tplArgs = this.model.attributes;
			tplArgs.beatDuration = this.model.getBeatDuration();
			tplArgs.barDuration = this.model.getBarDuration();
			if(this.model.audioCtx) {
				console.log('Render at', this.model.audioCtx.currentTime);
			}
			this.$el.html(this.template( tplArgs ));
			this.$('.speed-trainer-node').html( this.speedTrainerView.render().el );
			this.speedTrainerView.delegateEvents();


			return this
		}

	});

	var SpeedTrainerView = Backbone.View.extend({
		template: _.template( $('#speed-trainer').html() ),

		events: {
			'click #js-btn-toggle-trainer': 'toggleTrainer',
		},

		initialize: function() {
			this.model.on( 'change', this.render.bind(this) );
		},

		populateFormValues: function() {
			this.$from = this.$('#js-speedtrainer-from');
			this.$to = this.$('#js-speedtrainer-to');
			this.$stepSize = this.$('#js-speedtrainer-stepsize');

			var modelArgs = {
				from:	parseInt( this.$from.val(), 10 ),
				to:	parseInt( this.$to.val(), 10 ),
				stepSize:	parseInt( this.$stepSize.val(), 10 ),
			};

			console.log(modelArgs);

			this.model.set( modelArgs  );
		},

		toggleTrainer: function( evt ) {
			evt.preventDefault();

			this.populateFormValues();
			this.model.toggleTrainer();
		},

		render: function() {
			this.$el.html(this.template( this.model.attributes ));
			return this
		}

	});


	var barModel = new BarModel();
	window.barModel = barModel;
	var rootView = new MetronomeView( { model: barModel });
});

