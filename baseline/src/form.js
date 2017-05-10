var body = document.getElementsByTagName('body')[0];
body.classList.add( 'js-enabled' );

var inputs = document.querySelectorAll( '.file-control' );
Array.prototype.forEach.call( inputs, function( input ) {
	var label	 = input.nextElementSibling,
			labelVal = label.innerHTML;

	input.addEventListener( 'change', function( e )	{
		var fileName = e.target.value.split( '\\' ).pop();
		if(!fileName) { return false }
		label.querySelector( '.js-filename' ).innerHTML = fileName;
	});
});


$( '.collapse-toggle' ).on( 'click', function(evt) {
	var toggle = $( evt.target );
	toggle.closest( '.collapse-block' ).toggleClass( 'js-open' );
});






