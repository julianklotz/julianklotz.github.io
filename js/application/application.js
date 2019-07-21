"use strict";

const EVENT = {
	'PRESET_CHANGED': 'PRESET_CHANGED'
};


var logger = (function() {
	const LEVEL_DEBUG = 0;
	const LEVEL_INFO = 1;
	const LEVEL_WARN = 2;
	const LEVEL_ERROR = 3;

	var logLevel = LEVEL_ERROR;

	function log(level, args ) {
		if( level >= logLevel ) {
			console.log( "[" + getLabel( level ) + "]", args );
		}
	}

	function getLabel( level ) {
		var labels = ["Debug", "Info", "Warning", "Error"];
		return labels[level];
	}

	function setLogLevel(level) {
		if( level === 1 || level === 2 || level === 3 || level === 0) {
			logLevel = level;
		} else {
			log(LEVEL_WARN, 'Invalid log level: ' + level);
		}
	}

	function getLogLevel() {
		return logLevel;
	}

	return {
		log: log,
		getLogLevel: getLogLevel,
		setLogLevel: setLogLevel,
		WARN: LEVEL_WARN,
		INFO: LEVEL_INFO,
		ERROR: LEVEL_ERROR,
		DEBUG: LEVEL_DEBUG
	};
})();

logger.setLogLevel( 0 );



var getUniqueId = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
};


var storageBackend = (function() {

	const SETTINGS = 'settings';
	const PRESETS = 'presets';

	function supportsLocalStorage() {
		var mod = '1-2-mic-check';
		try {
			localStorage.setItem(mod, mod);
			localStorage.removeItem(mod);
			return true;
		} catch(e) {
			return false;
		}
	}

	function saveSettings( settings ) {
		if( supportsLocalStorage() ) {
			// Do not store info like muted/unmuted – only meaningful settings
			var params = {
				'bpm': settings.bpm,
				'meter': settings.meter
			};
			setItem( SETTINGS, params );
		}
	}

	function loadPresets( completedCallback ) {
		var presets = getItem( PRESETS );
		if( typeof presets !== 'undefined' || presets !== 'undefined' ) {
			completedCallback( presets );
		} else {
			completedCallback( [] );
		}
	}

	function clearPresets() {
		setItem( PRESETS, [] );
	}

	function getPresetById( id) {
		// TODO: Implement using callback
		var presets = loadPresets( PRESETS );
		savedPreset = _.find( presets, function( preset ) {
			return id === preset.id;
		});
		return undefined
	}

	function savePreset( presetData ) {
		var presets = getItem( PRESETS );
		if( presets ) {
			// Find existing preset.
			var savedPreset = _.find( presets, function( preset ) {
				return presetData.id === preset.id;
			});

			// Existing preset found.
			if( savedPreset ) {
				savedPreset.id = presetData.id;
				savedPreset.name = presetData.name;
				savedPreset.bpm = presetData.bpm;
				savedPreset.meter = presetData.meter;
				savedPreset.artist = presetData.artist;
				savedPreset.last_used = presetData.last_used;
				logger.log( logger.INFO, "Updating preset settings …");

			} else {
				// Preset is new
				logger.log( logger.INFO, "Creating new preset: " + presetData );
				presets.push( presetData );
			}
		} else {
			// Initialize preset list cause it doesn't exist
			logger.log( logger.INFO, "No presets saved yet -- initializing" );
			presets = [presetData];
		}

		// Save.
		logger.log( logger.INFO, "Writing changes");
		setItem( PRESETS, presets );
	}

	function loadSettings() {
		return getItem( SETTINGS );
	}

	function getItem( itemName ) {
		if( supportsLocalStorage() ) {
			var s = localStorage.getItem( itemName );
			if( s !== 'undefined' && typeof s !== 'undefined' ) {
				return JSON.parse( s );
			} else {
				return undefined;
			}

		} else {
			logger.log(logger.ERROR, "Local storage is not supported – while trying to get: " + itemName);
		}
	}

	// data: native JavaScript data structure
	function setItem( itemName, data ) {
		if( supportsLocalStorage() ) {
			localStorage.setItem( itemName, JSON.stringify(data) );
		} else {
			logger.log(logger.ERROR, "Local storage is not supported – while trying to set: " + itemName);
		}
	}

	var api = {
		saveSettings: saveSettings,
		loadSettings: loadSettings,
		loadPresets: loadPresets,
		savePreset: savePreset,
		clearPresets: clearPresets
	}

	return api;

})();


var rootAudioContext = ( function() {
	var Ctor = window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

	if( !Ctor ) {
		alert("Sorry, your browser does not support playing sound using the Web Audio API.");
	}

	return new Ctor();
} )();


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
	"use strict";

	var Preset = Backbone.Model.extend({
		defaults: {
			'id': undefined,
			'name': undefined,
			'bpm': undefined,
			'meter': undefined,
			'artist': undefined,
			'last_used': undefined
		},

		updateLastUsed: function(options) {
			this.set( 'last_used', Date.now(), options );
		},

		save: function() {
			if( this.isNew() ) {
				this.set( 'id', getUniqueId(), { silent: true } );
			}

			if( typeof this.get('last_used') !== 'number' ) {
				this.updateLastUsed( { silent: true } );
			}

			storageBackend.savePreset( this.toJSON() );
		}
	});

	var PresetCollection = Backbone.Collection.extend({
		model: Preset,

		comparator: function(a, b) {
			var aLastUsed = a.get('last_used'),
				bLastUsed = b.get('last_used');

			if( aLastUsed > bLastUsed ) {
				return -1;
			} else if( aLastUsed === bLastUsed) {
				return 0;
			} else {
				return 1;
			}
		},

		_currentPreset: undefined,

		initialize: function() {
			_.bindAll( this, 'fetch', 'onFetched', 'setCurrentPreset', 'getCurrentPreset' );
		},


		setCurrentPreset: function( preset ) {
			if( this.currentPreset === preset) {
				logger.log(logger.INFO, "Not setting now preset – same as recent.");
				return this.currentPreset
			}

			this._currentPreset = preset;
			// Notify rest of application
			this.trigger( EVENT.PRESET_CHANGED, this._currentPreset );

			return this._currentPreset;
		},

		getCurrentPreset: function( preset ) {
			return this._currentPreset;
		},

		fetch: function() {
			storageBackend.loadPresets( this.onFetched );
		},

		// Presetdata: an array contain javascript objects
		onFetched: function( presetData ) {
			this.reset( presetData );
		}

	});


	/*
	  TODO

	  var presets = new PresetCollection();
	  presets.fetch();
		presets.setCurrentPreset( presets.first() );

	*/

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
		unlocked: false,

		initialize: function(options) {
			this._timer = new Worker("js/application/metronomeworker.js");
			this._timer.postMessage({ "interval": this._lookahead });
			this._timer.onmessage = this.onTimerMessage.bind(this);
			_.bindAll(this, 'unlock');

			this.initAudioContext();

			document.getElementsByClassName('js-hide-overlay')[0].addEventListener('touchstart', this.unlock, false);
			document.getElementsByClassName('js-hide-overlay')[0].addEventListener('touchend', this.unlock, false);
			document.getElementsByClassName('js-hide-overlay')[0].addEventListener('click', this.unlock, false);


			this.on('change:meter', this.onChange);
			this.on('change:bpm', this.onChange);

			this._timer.postMessage('start');

			var settings = storageBackend.loadSettings();
			if( settings ) {
				this.set( settings );
			}
		},

		setFromPreset: function( preset ) {
			logger.log(logger.INFO, "Setting from preset: " + preset.toJSON() );
			this.setBpm( preset.get('bpm') );
			this.setMeter( preset.get('meter') );
		},

		// Is used in view to check whether re-paint is necessary
		onChange: function(e) {
			this.dirty = true;
			storageBackend.saveSettings( this.toJSON() );
		},

		onTimerMessage: function(e) {
			if (e.data == "tick") {
				this.scheduler();
			}
		},

		scheduler: function() {
			if( this.unlocked === false) { return }

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

			$('#overlay').fadeTo(150, 0, function(){ $(this).hide();});

			var myContext = this.audioCtx;
			var buffer = myContext.createBuffer(1, 1, 22050);
			var source = myContext.createBufferSource();

			source.buffer = buffer;
			source.connect(myContext.destination);
			source.start(0);

			var cb = (function() {
				var that = this;
				var src = source;

				return (function() {
					if((src.playbackState === src.PLAYING_STATE || src.playbackState === src.FINISHED_STATE)) {
						that.unlocked = true;
						that.set( 'isMuted', false );

						document.getElementsByClassName('js-hide-overlay')[0].removeEventListener('touchstart', that.unlock);
						document.getElementsByClassName('js-hide-overlay')[0].removeEventListener('touchend', that.unlock);
						document.getElementsByClassName('js-hide-overlay')[0].removeEventListener('click', that.unlock);
					}
				})
			})();

			setTimeout( _.bind( cb, this ), 0 );

			this.unlocked = true;
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

			if( !this.isMuted() ) {
				clickSound.start( time );
			}


			if(this._quarterNoteCount >= this.get( 'meter' ) ) {
				this._quarterNoteCount = 0;
			}

		},

		initAudioContext: function() {
			this.audioCtx = rootAudioContext;
			var bufferLoader = new BufferLoader( this.audioCtx, ['audio/4d.wav'], this.finishedLoading.bind(this) );
			bufferLoader.load();
		},

		finishedLoading: function(bufferList) {
			this._bufferList = bufferList;
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
			}

			return this.get('meter')
		},

		getMeter: function() {
			return this.get( 'meter' );
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

		getBpm: function() {
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

	var Tappr = Backbone.Model.extend({

		MAX_TAP_BUFFER_SIZE: 4,
		tapBuffer: undefined,
		timer: undefined,

		initialize: function( options ) {
			this.audioContext = options.audioContext;
			this.metronome = options.model;
			this.tapBuffer = [];
		},

		tap: function() {
			// Make sure the buffer doesn't exceed it’s maximum size
			if( this.tapBuffer.length >= this.MAX_TAP_BUFFER_SIZE ) {
				this.tapBuffer.pop();
			}

			// Add current tap
			var time = this.audioContext.currentTime;
			this.tapBuffer.unshift( time );

			// We need at least two taps to determine a time
			if( this.tapBuffer.length < 2 ) {
				return
			}

			var timeBetweenTaps = ( this.tapBuffer[0] - this.tapBuffer[ this.tapBuffer.length - 1 ]) / (this.tapBuffer.length - 1);
			var bpm = Math.round( 60 / timeBetweenTaps);

			this.metronome.setBpm( bpm );

			// Init timeout
			if( this.timer ) {
				window.clearTimeout( this.timer );
			}
			this.timer = window.setTimeout( _.bind( this.clearBuffer, this ), 1000 );
		},

		clearBuffer: function() {
			console.log("Clearing buffer.");
			this.tapBuffer = [];
			this.timer = undefined;
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

		getSteps: function() {
			var f = this.get( 'from' );
			var t = this.get( 'to' );
			var steps = [];
			var current = f;

			while( current <= t ) {
				steps.push( current );
				current += this.get('stepSize');
			}

			return steps
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

	var PresetCollectionView = Backbone.View.extend({
		template: _.template( $('#preset-controls').html() ),
		events: {
			'click #btn-update-preset-settings': 'updatePresetSettings',
			'click #btn-create-preset': 'createPreset'
		},

		initialize: function(options) {
			_.bindAll(this, 'addAll', 'addOne', 'render', 'updatePresetSettings');

			this.metronome = options.metronome;
			this.collection = options.collection;
			this.collection.on('reset', this.addAll);
			this.collection.on('change', this.render);
			this.collection.on('add', this.render);

			// Make sure there's some HTML to populate
			this.render();
			this.collection.fetch();
		},

		createPreset: function(evt) {
			var presetName = null,
					preset;

			presetName = window.prompt("Please enter a preset name");

			if( presetName === null ) {
				return
			}

			preset = new Preset({
				'name': presetName,
				'bpm': this.metronome.getBpm(),
				'meter': this.metronome.getMeter(),
				'artist': 'artist not implemented'
			});

			preset.save();
			this.collection.add( preset );
		},

		updatePresetSettings: function(evt) {
			var currentPreset = this.collection.getCurrentPreset();
			if( currentPreset ) {
				currentPreset.set({
					'bpm': this.metronome.getBpm(),
					'meter': this.metronome.getMeter()
				});

				currentPreset.save();
			} else {
				console.error( 'Current preset should be present, but couldn’t be found.' );
			}
		},

		addAll: function() {
			this.presetListNode.html('');
			this.collection.each( this.addOne, this );
		},

		addOne: function(preset) {
			var view = new PresetView({ model: preset, collection: this.collection });
			this.presetListNode.append( view.render().el );
		},

		render: function(evt) {
			console.log("Collection repaint triggered", evt );

			var currentPreset = this.collection.getCurrentPreset();

			if( currentPreset ) {
				this.$el.html( this.template( { 'currentPreset': this.collection.getCurrentPreset().attributes } ) );
			} else {
				this.$el.html( this.template( { 'currentPreset': false} ) );
			}
			this.presetListNode = this.$( '#preset-list-node' );
			this.addAll();

			return this
		}
	});

	var PresetView = Backbone.View.extend({
		tagName: 'li',
		className: 'preset',
		template: _.template( $('#preset-single').html() ),
		events: {
			'click': 'onPresetClicked'
		},

		initialize: function(options) {
			_.bindAll(this, 'onPresetClicked');
			this.collection = options.collection;
		},

		onPresetClicked: function(evt) {
			evt.preventDefault();
			this.collection.setCurrentPreset( this.model );
			this.model.updateLastUsed();
			this.model.save();
			return false;
		},

		render: function() {
			this.$el.html( this.template( this.model.attributes ) );
			return this;
		}
	});


	var MetronomeView = Backbone.View.extend({
		className: 'wrap-center',
		el: '#root',
		template: _.template( $('#metronome').html() ),


		initialize: function(options) {

			this.presetCollection = options.presetCollection;
			this.speedTrainer = new SpeedTrainer({ metronome: this.model });
			this.speedTrainerView = new SpeedTrainerView({ model: this.speedTrainer });
			this.metronomeControlsView = new MetronomeControlsView({ model: this.model });
			this.animationView = new CircleAnimationView({ model: this.model });
			this.presetCollection.on( EVENT.PRESET_CHANGED, this.onPresetChanged, this );
			// this.presetCollectionView = new PresetCollectionView({collection: this.presetCollection, metronome: this.model});

			this.render();
		},

		onPresetChanged: function( preset ) {
			this.model.setFromPreset( preset );
		},


		render: function() {
			this.$el.html(this.template( this.model.attributes ));

			this.$('.speed-trainer-node').html( this.speedTrainerView.render().el );
			this.$('.animation-node').html( this.animationView.render().el );
			this.$('.metronome-controls-node').html( this.metronomeControlsView.render().el );
			// this.$('.preset-collection-node').html( this.presetCollectionView.render().el );

			this.speedTrainerView.delegateEvents();

			return this
		}

	});

	var MetronomeControlsView = Backbone.View.extend({
		events: {
			'click #js-btn-toggle-mute': 'onMute',

			'input #js-input-bpm': 'onInputBpm',
			'click #js-increment-bpm': 'onIncrementBpm',
			'click #js-decrement-bpm': 'onDecrementBpm',

			'input #js-input-meter': 'onInputMeter',
			'click #js-increment-meter': 'onIncrementMeter',
			'click #js-decrement-meter': 'onDecrementMeter',
			'click #js-tap-button': 'onTapButton',

		},

		initialize: function() {
			this.template = _.template( $('#metronome-controls').html() );
			this.$inputBpm = this.$('#js-input-bpm');
			this.$incBpm = this.$('#js-increment-bpm');
			this.$decBpm = this.$('#js-decrement-bpm');
			this.$inputMeter = this.$('#js-input-meter');
			this.$incMeter = this.$('#js-increment-meter');
			this.$decMeter = this.$('#js-decrement-meter');
			this.$tapBtn = this.$('#js-tap-button');


			this.tappr = new Tappr( { audioContext: rootAudioContext, model: this.model } );
			this.model.on('change', this.render.bind(this));
		},

		onTapButton: function(evt) {
			evt.preventDefault();
			this.tappr.tap();

			return false
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
			var params = this.model.toJSON()
			params.steps = this.model.getSteps();
			console.log( params.steps );
			this.$el.html(this.template( params ));
			return this
		}

	});

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('./cacheworker.js')
			.then(function() { console.log('Service Worker Registered'); });
	}

	var barModel = new BarModel();
	window.barModel = barModel;

	var presetCollection = new PresetCollection();
	window.presetCollection = presetCollection;

	var rootView = new MetronomeView( { model: barModel, presetCollection: presetCollection });

	presetCollection.fetch();
});

function test() {
	var demoPreset1 = {
		bpm: 80,
		meter: 5,
		artist: "The Tallest Man on Earth",
		name: "The Gardener",
		id: 'the-gardener'
	}
	var demoPreset2 = {
		bpm: 134,
		meter: 3,
		artist: "Led Zeppelin",
		name: "Good Times, Bad Times",
		id: 'good-times-bad-times'
	}

	function testStorageBackend() {
		storageBackend.clearPresets();
		storageBackend.savePreset( demoPreset1 );
		storageBackend.savePreset( demoPreset2 );
		presets = storageBackend.loadPresets(
			function(presets) {
				if( presets.length !== 2 ) {
					console.error("There should be two presets, but length is ", presets.length );
				}
			}
		);
	}

	testStorageBackend();
}


