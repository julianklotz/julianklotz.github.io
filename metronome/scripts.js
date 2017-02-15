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
			"bpmMax": 240,
			"bpmMin": 30,
		},

		_lookahead: 25.0,
		_currentBeat: 1,
		_scheduleAheadTime: 0.1, // scheduling ahead, in seconds
		_bufferList: null,
		_nextNoteTime: null,
		_quarterNoteCount: 0,

		notesInQueue: [],
		audioCtx: null,
		dirty: false,

		initialize: function(options) {
			this._timer = new Worker("metronomeworker.js");
			this._timer.postMessage({ "interval": this._lookahead });
			this._timer.onmessage = this.onTimerMessage.bind(this);

			this.initAudioContext();

			$('#root').addEventListener('touchstart', this.unlock.bind(this), false);

			this.on('change:isMuted', this.onMuteChange);
			this.on('change:meter', this.onChange);
			this.on('change:bpm', this.onChange);
			this.onMuteChange();
		},

		// Is used in view to check whether re-paint is necessary
		onChange: function(e) {
			this.dirty = true;
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

		/**
		 * https://paulbakaus.com/tutorials/html5/web-audio-on-ios/
		 */
		unlock: function() {
			console.log( 'unlog' );
			var myContext = this.audioContext;
			var buffer = myContext.createBuffer(1, 1, 22050);
			var source = myContext.createBufferSource();
			source.buffer = buffer;

			source.connect(myContext.destination);

			source.noteOn(0);
		},

		schedulePlayback: function( time ) {
			this.notesInQueue.push( { time: time, quarterNoteCount: this._quarterNoteCount } );
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
			} else {
				this._timer.postMessage('stop');
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

		start: function() {
			this.metronome.on("LAST_BEAT", this.onBeatLast);
			this.set({ 'isRunning': true, 'currentSpeed': this.get('from')} );
			this.metronome.setBpm( this.get('currentSpeed') );
		},

		stop: function() {
			console.log('-- STOP --');
			this.set( 'isRunning', false );
			this.metronome.off("LAST_BEAT", this.onBeatLast);
		},

	});

	var MetronomeView = Backbone.View.extend({
		className: 'wrap-center',
		el: '#root',
		template: _.template( $('#metronome').html() ),


		initialize: function() {
			this.speedTrainer = new SpeedTrainer({ metronome: this.model });
			this.speedTrainerView = new SpeedTrainerView({ model: this.speedTrainer });
			this.metronomeControlsView = new MetronomeControlsView({ model: this.model });
			this.animationView = new CircleAnimationView({ model: this.model });
			this.render();
		},


		render: function() {
			this.$el.html(this.template( this.model.attributes ));

			console.log( this.$('.animation-node'));

			this.$('.speed-trainer-node').html( this.speedTrainerView.render().el );
			this.$('.animation-node').html( this.animationView.render().el );
			this.$('.metronome-controls-node').html( this.metronomeControlsView.render().el );
			this.speedTrainerView.delegateEvents();

			return this
		}

	});

	var MetronomeControlsView = Backbone.View.extend({
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
			this.template = _.template( $('#metronome-controls').html() );
			this.$inputBpm = this.$('#js-input-bpm');
			this.$incBpm = this.$('#js-increment-bpm');
			this.$decBpm = this.$('#js-decrement-bpm');
			this.$inputMeter = this.$('#js-input-meter');
			this.$incMeter = this.$('#js-increment-meter');
			this.$decMeter = this.$('#js-decrement-meter');

			this.model.on('change', this.render.bind(this));
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
			this.$el.html( this.template( this.model.attributes ) );

			return this
		}

	});

	var CircleAnimationView = Backbone.View.extend({

		initialize: function() {
			this.template = _.template( $('#circle-animation').html() );
			this.draw();
		},

		draw: function() {
			var currentNote = null,
					currentTime = this.model.audioCtx.currentTime,
					notesInQueue = this.model.notesInQueue;


			while (notesInQueue.length && notesInQueue[0].time < currentTime) {
				currentNote = notesInQueue[0];
				notesInQueue.splice(0,1);   // remove note from queue

				if(currentNote.quarterNoteCount + 1 === this.model.get('meter')) {
					this.model.trigger('LAST_BEAT');
				}

				// New bar, new render to keep in sync
				if( currentNote.quarterNoteCount === 0 || this.model.dirty === true ) {
					this.render();
					this.model.dirty = false;
				}
			}
			window.requestAnimationFrame( this.draw.bind(this) );
		},

		render: function() {
			var tplArgs = this.model.attributes;
			tplArgs.beatDuration = this.model.getBeatDuration();
			tplArgs.barDuration = this.model.getBarDuration();

			this.$el.html(this.template( tplArgs ));
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

