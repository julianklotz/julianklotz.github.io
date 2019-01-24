var SUGGEST = ( function() {

	var config = {
		'currentItemClass': 'current',
		'listItemClass': 'auto-suggest--item',
		'overlayClass': 'auto-suggest-overlay'
	};

	var overlay;

	var configure = function( _config ) {
		config = _config;
		return config
	};

	var close = function() {
		debugger
		if( overlay ) {
			overlay.style.display = 'none';
		}
	};

	var open = function() {
	};


	var _onOverlayClick = function( evt ) {
		if( evt.target == evt.currentTarget ) {
			console.log( 'Calling close');
			close();
		}
	}

	var install = function() {
		overlay = document.getElementsByClassName( config.overlayClass )[0];
		if( overlay ) {
			overlay.addEventListener( 'click', _onOverlayClick );
		} else {
			console.error( 'SUGGEST: overlay with class ' + config.overlayClass + ' not found.');
		}
	}

	var api = {
		install: install,
		config: config,
		open: open,
		close: close
	};

	return api
} )();
