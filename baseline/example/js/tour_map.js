oa.api.maps( initOA );

var l;
function initOA( oamaps, gm ) {

    // a single tour
    var content = '104116276';

    var layerConfig = (oa.PREFIX === 'oam') ? null : {
		markersActive : true,
		fitPoiBounds : true,
		defaultIW : true
    };

    // initialize GeomLayer
    layer = new oamaps.GeomLayer( content, layerConfig );

    layer.whenLoaded( initMap );

    function initMap() {

	var mapId = "map_canvas";
	var mapDiv = document.getElementById( mapId );

	var mapTypeIds = ['oa_map'];

	var mapConfig = {
            zoom: 16,
            mapTypeId : mapTypeIds[ 0 ],
            mapTypeControlOptions : { mapTypeIds: mapTypeIds }
        };

        var bounds = layer.getBounds();

        if (oa.PREFIX=='oax') {
            mapConfig.bounds = bounds;
	    map = oamaps.map( mapDiv, mapConfig );
        } else {
            mapConfig.center = bounds.center;
	    map = oamaps.map( mapDiv, mapConfig );
            map.fitBounds(L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]));
        }

        // add GeomLayer to map
        layer.setMap( map );
        
    }

}