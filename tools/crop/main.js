var VIEWPORT_MARGIN = 100;

var IMAGE_FORMATS = [
	{
		name: 'Leaderboard',
		id: 'leaderboard',
		width: 728,
		height: 90,
	},
	{
		name: 'Content Ad',
		id: 'content-ad',
		width: 300,
		height: 250,
	},
	{
		name: 'Skyscraper',
		id: 'skyscraper',
		width: 160,
		height: 600,
	},
	{
		name: 'Halfpage Ad',
		id: 'halfpage-ad',
		width: 300,
		height: 600,
	},
	{
		name: 'Billboard',
		id: 'billboard',
		width: 800,
		height: 250,
	},
	{
		name: '3:1 Rectangle',
		id: '3-1-rectangle',
		width: 300,
		height: 100,
	},
	{
		name: 'Mobile Leaderboard',
		id: 'mobile-leaderboard',
		width: 300,
		height: 50,
	},
];


_.templateSettings.variable = "tpl";
var htmlTemplate = '<div class="image-format">' +
		'<h2><%= tpl.name %>, <%= tpl.width %>×<%= tpl.height %></h2>' +
		'<h4>1. Datei auswählen</h4>' +
		'<input type="file" id="upload-<%= tpl.id %>" />' +
		'<h4>2. Bildausschnitt einstellen</h4>' +
		'<div class="" id="<%= tpl.id %>">' +
		'</div>' +

		'<h4>3. Bild speichern</h4>' +
		'<a href="#" download="<%= tpl.id %>_<%= tpl.width %>_<%= tpl.height %>.png" id="download-<%= tpl.id %>" >Speichern</a>' +
	'</div>';


// Reads a field uploaded to <uploadField> and calls <callback> when done.
// The <callback> is passed the FileReader’s result object, a data url.
// Optionally, specify the binding of <this> in the callback function by
// providing a context.
var getImageFromUploadField = function(uploadField, callback, context) {
	if (uploadField.files && uploadField.files[0]) {
		var reader = new FileReader();

		reader.onload = function (e) {
			if(!context) {
				context = window;
			}
			callback.call(context, e.target.result);
		}

		reader.readAsDataURL(uploadField.files[0]);
	}
}

function downloadLinkFor(id) {
	return 'download-' + id;
}

function uploadFieldFor(id) {
	return 'upload-' + id;
}

// render node for the specified image format
function renderImageFormatNode(format) {
	var tpl = _.template( htmlTemplate );
	$('.wrap-center').append( tpl(format) );
}

function addImageFormat(format) {
		renderImageFormatNode( format );
		var croppie = new Croppie( document.getElementById(format.id), {
				viewport: {
					width: format.width,
					height: format.height,
				},
				boundary: {
					width: format.width + VIEWPORT_MARGIN,
					height: format.height + VIEWPORT_MARGIN,
				},
				update: function() {
					var prom = croppie.result('canvas');
					prom.then(function(dataStr) {
						document.getElementById( downloadLinkFor(format.id) ).href= dataStr;
					});
				},
		});

		var didSelectImageCallback = function(imageData) {
			croppie.bind({ url: imageData });
		}

		var uploadField = $('#' + uploadFieldFor( format.id ) );
		uploadField.on('change', function(evt) {
				getImageFromUploadField(this, didSelectImageCallback);
		});
}

function addImageFormats(config) {
	var format;
	for (var i = 0; i < config.length; i++) {
		format = config[i];
		if( isValid(format) ) {
			addImageFormat(format);
		} else {
			console.error('Skipping malformed image format', format);
		}
	}
}

/**
 * Parse a configuration string specified as document hash.
 * Example: #medium-rectangle,300,250;skyscaper,120,700
 */
function getConfigFromHash() {
	if(document.location.hash.length < 2) { // Hash consists of at least two chars
		return undefined
	}

	var hash = document.location.hash.slice(1); // Remove # character
	var split = hash.split(';');
	var formats = [];

	for(var i = 0; i < split.length; i++) {
		var part = split[i];
		part = part.split(',');

		if(part.length !== 3) {
			console.error('Invalid URL part -- must consist of three parts', part);
			continue
		}

		formats.push({
			id: part[0],
			name: part[0].replace('-', ' '),
			width: parseInt(part[1], 10),
			height: parseInt(part[2], 10),
		});
	}
	if(formats.length === 0) {
		return undefined
	} else {
		return formats
	}
}

function isValid(format) {
	if(!format.id || format.id.length === 0 || typeof format.id !== 'string') {
		return false
	}
	if(!format.name || format.name.length === 0 || typeof format.name !== 'string') {
		return false
	}
	if(typeof format.width !== 'number') {
		return false
	}
	if(typeof format.height !== 'number') {
		return false
	}
	return true
}

// Bootstrap
$(document).ready(function() {
	var config = getConfigFromHash();

	if(!config) {
		config = IMAGE_FORMATS;
	}

	console.log('Using config', config);
	addImageFormats( config );
});


