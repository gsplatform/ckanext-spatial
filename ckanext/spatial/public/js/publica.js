var $_ = _ // keep pointer to underscore, as '_' will be overridden by a closure variable when down the stack


this.ckan.module('olpreview2', function (jQuery, _) {

    var proxy = false;
    var GEOSERVER_URL = "http://geoserver.dev.publicamundi.eu:8080/geoserver";

    
    
    var createKMLLayer = function (resource) {
        var url = resource.proxy_url || resource.url

        var kml = {
                title: 'KML',
                type: PublicaMundi.LayerType.KML,
                url: url,
                click: onFeatureClick
        }

        return kml;
    }


    var createGMLLayer = function (resource) {
        var url = resource.proxy_url || resource.url
        
        var gml = {
            title: 'GML',
            featureNS: undefined,
            featureType: undefined,
            type: PublicaMundi.LayerType.GML,
            url: url,
            click: onFeatureClick,
            //projection: resource.projection? resource.projection: 'EPSG:3857',
            //projection: 'EPSG:2100',
            //projection: 'EPSG:4326'
        }
        return gml;
        //TODO styles

        //return gml
    }

    var parseWFSCapas = function(resource, url, callback, failCallback) {
        
        $.ajax(url+"?service=WFS&request=GetCapabilities").then(function(response) {
            
            response = xmlToJson(response);
            console.log(response);
            var candidates = response["wfs:WFS_Capabilities"]["FeatureTypeList"];
            if (typeof candidates === "undefined") {
                candidates = response["wfs:WFS_Capabilities"]["wfs:FeatureTypeList"]["wfs:FeatureType"];
            }
            else{ 
                candidates = candidates["FeatureType"];
            }
            var version = response["wfs:WFS_Capabilities"]["@attributes"]["version"];
            
            var format_vals = response["wfs:WFS_Capabilities"]["ows:OperationsMetadata"]["ows:Operation"];
            console.log(format_vals);
            console.log('looking...');
            /*
            for (var i=0; i<format.length; i++){
                if (format[i]["@attributes"] == 'GetFeature'){
                    var t = format[i]["ows:Parameter"];
                    console.log(t);
                    for (var k =0; k<t.length; k++){
                        if (t[k]["@attributes"] == 'outputFormat'){
                            console.log('found!');
                            console.log(t[k]["ows:AllowedValues"]);
                        }
                    }
                }
            } */
            getValue(format_vals, "outputFormat");
            console.log(outputFormat);

            var format;
            if (outputFormat.indexOf('json') > -1 || outputFormat.indexOf('application/json') > -1){
                format = 'json';
            }
            else if (version == '1.1.0'){
                format = 'gml3';
            }
            else if (version == '1.0.0'){
                format = 'gml2';
            }


            // In case the url shows to our geoserver look for the specific resource layer name (publicamundi:xxxxx)
            if (resource.url.startsWith(GEOSERVER_URL)){
                console.log('PublicaMundi GEOSERVER');
                if (resource.vectorstorer_resource){
                    var found = false;
                    //console.log('candidates');
                    $_.each(candidates, function(candidate, idx) {
                        //console.log(candidate["Name"]["#text"]);
                        if (candidate["Name"]["#text"] == resource.wfs_layer){
                            candidates = candidate;
                            found = true;
                            return false;
                        }
                    });
                    if (found == false){
                        console.log('oops..layer not found, something wrong here...');
                    }
                }
                else{
                    console.log('resource not proper vector storer resource');
                }
            };

            //console.log(version); 
            callback(candidates, version, format);

        });

    }

    var withFeatureTypesLayers = function (resource, layerProcessor) {
        console.log('wfs');
        console.log(resource);
        
        var parsedUrl = resource.url.split('#')
        var url = resource.proxy_service_url || parsedUrl[0]

        var ftName = parsedUrl.length>1 && parsedUrl[1]

        parseWFSCapas(
            resource,
            url,
            function(candidates, version, format) {
                var count = candidates.length;

                $_.each(candidates, function(candidate, idx) {
                    // TODO: Need to implement this in a better way
                    //console.log('wfs item');
                    //console.log(candidate);

                    //json = xmlToJson(candidate);
                    //console.log(json);
                    var title = candidate["Title"];
                    if (typeof title === "undefined") {
                        title = candidate["wfs:Title"];
                    }
                    title = title["#text"];
                    //console.log(title);
                    
                    var name = candidate["Name"];
                    if (typeof name === "undefined") {
                        name = candidate["wfs:Name"];
                    }
                    name = name["#text"];
                    //console.log(name);
                    
                    var bbox = candidate["WGS84BoundingBox"];
                    var lc = null;
                    var uc = null;
                    if (typeof bbox === "undefined") {
                        bbox = candidate["ows:WGS84BoundingBox"];
                        lc = bbox['ows:LowerCorner']["#text"];
                        uc = bbox['ows:UpperCorner']["#text"];
                    }
                    else {
                        lc = bbox['LowerCorner']["#text"];
                        uc = bbox['UpperCorner']["#text"];
                    }

                        lc = lc.split(' ');
                        uc = uc.split(' ');
                        bboxfloat = [ parseFloat(lc[0]), parseFloat(lc[1]), parseFloat(uc[0]), parseFloat(uc[1]) ];

                var crs = null;
                if (candidate["DefaultCRS"]){
                    var crs_raw = candidate["DefaultCRS"]["#text"];
                    var crs_arr = crs_raw.split(":");
                    crs = crs_arr[crs_arr.length-3]+":"+crs_arr[crs_arr.length-1];
                }
               // moved inside api
                // if ( crs == 'EPSG:26713'){
               //     crs = 'EPSG:3857';
               // }
               // else if ( crs == 'EPSG:900913'){
               //     crs = 'EPSG:3857';
               // }

                var visibility = false;
                // If only 1 layer available then make it visible on load
                if (count == 1){
                    visibility = true;
                }
               
                // If there is a layer that matches part of the resource title then make it visible on load
                if (resource.name.startsWith(title)){
                    visibility = true;
                }


                var ftLayer = { 
                    name: name,
                    title: title,
                    visible: visibility,
                    type: PublicaMundi.LayerType.WFS,
                    click: onFeatureClick,
                    format: format,
                    bbox: bboxfloat,
                    //projection: crs,
                    version: version,
                    url: url,
                    maxFeatures: '100',
                };
            
                layerProcessor(ftLayer)
        
                })
        
             })
}

var parseWMSCapas = function(resource, url, callback, failCallback) {
       
        var parser = new ol.format.WMSCapabilities();
        $.ajax(url+"?service=WMS&request=GetCapabilities").then(function(response) {
            var response = parser.read(response);
            console.log(response);
            var version = response["version"];
            var candidates = response["Capability"]["Layer"]["Layer"];
            console.log('parsing');
            console.log(resource.url);
            if (resource.url.startsWith(GEOSERVER_URL)){
                console.log('PublicaMundi GEOSERVER');
                if (resource.vectorstorer_resource){
                    var found = false;
                    $_.each(candidates, function(candidate, idx) {
                        if (candidate["Name"] == resource.wms_layer){
                            candidates = candidate;
                            found = true;
                            return false;
                        }
                    });
                    if (found == false){
                        console.log('oops..layer not found, something wrong here...');
                    }
                }
                else{
                    console.log('resource not proper vector storer resource');
                }
            };

            callback(candidates, version);

        });
    }

var withWMSLayers = function (resource, layerProcessor) {
    console.log('wms');
    console.log(resource);
    var parsedUrl = resource.url.split('#')
    var urlBody = parsedUrl[0].split('?')[0] // remove query if any
    var url = resource.proxy_service_url || urlBody

    var layerName = parsedUrl.length>1 && parsedUrl[1]
    parseWMSCapas(
        resource,
        url,
        function(candidates, version) {
            var count = candidates.length;

            if (layerName) candidates = candidates.filter(function(layer) {return layer.name == layerName})
            
                $_.each(candidates, function(candidate, idx) {
            
                var title = candidate["Title"];
                var name = candidate["Name"];
                var bbox = candidate["BoundingBox"];

                console.log('bbox');
                console.log(bbox);
                    
                var visibility = false;
                // If only 1 layer available then make it visible on load
                if (count == 1){
                    visibility = true;
                }
               
                // If there is a layer that matches part of the resource title then make it visible on load
                if (resource.name.startsWith(title)){
                    visibility = true;
                }

                //var bboxfloat=null;
                //$_.each(bbox, function(at, idx) {
                var bboxfloat = extractBbox(bbox);
                //    });
                console.log('bboxfloat');
                console.log(bboxfloat);
                
                var mapLayer = {
                    type: PublicaMundi.LayerType.WMS,
                    url: urlBody, // use the original URL for the getMap, as there's no need for a proxy for image request
                    //transparent: true,
                    name: name,
                    title: title,
                    bbox: bboxfloat,
                    visible: visibility,
                    params: {'LAYERS': name,
                             'VERSION': version},
                };

                layerProcessor(mapLayer)
                })

                }
            )

    }
    // Helper functions 
    //
    
    var outputFormat = [];
    function getValue(obj, value) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (obj[key]["name"] == value) {
                    getKey(obj, "#text");
                }

                else if ("object" == typeof(obj[key])) {
                    getValue(obj[key], value);
                }             }
        }
    }
    function getKey(obj, name){
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if ("object" == typeof(obj[key])) {
                    getKey(obj[key], name);
                }
                else if (key == name){
                    outputFormat.push(obj[key]);
                }
            }
        }
    }

    String.prototype.startsWith = function(str){
        return this.indexOf(str) == 0;
    }

    var extractBbox = function (bbox) {
        var bboxtemp= null;
        //$_.each(candidates, function(candidate, idx) {
        $_.each(bbox, function(at, idx) {
            if(at["crs"] == "EPSG:4326") {
                bboxtemp = [ at["extent"][1], at["extent"][0], at["extent"][3], at["extent"][2] ];
                //return bboxfloat;
            }
            else if(at["crs"] == "CRS:84") {
                    console.log('is crs 84');
                    console.log(at);
                    bboxtemp = [ at["extent"][0], at["extent"][1], at["extent"][2], at["extent"][3] ];
                    //return bboxfloat;
                }
            //console.log(bboxfloat);
            console.log(bboxtemp);
            //else {
                //null;
            //}
        });
        return bboxtemp;

    }
    var createGeoJSONLayer = function (resource) {
        
        var url = resource.proxy_url || resource.url
        
            var geojson = {
                title: 'GeoJson',
                type: PublicaMundi.LayerType.GeoJSON,
                url: url,
                visible: false,
                click: onFeatureClick

        };

        //TODO add styles
        return geojson
    }

   

    var layerExtractors = {
        'kml': function(resource, layerProcessor) {layerProcessor(createKMLLayer(resource))},
        'gml': function(resource, layerProcessor) {layerProcessor(createGMLLayer(resource))},
        'geojson': function(resource, layerProcessor) {layerProcessor(createGeoJSONLayer(resource))},
        'wfs': withFeatureTypesLayers,
        'wms': withWMSLayers,
    }

    var withLayers = function(resource, layerProcessor) {
        var resourceUrl = resource.url
        var proxiedResourceUrl = resource.proxy_url
        var proxiedServiceUrl = resource.proxy_service_url

        var withLayers = layerExtractors[resource.format && resource.format.toLocaleLowerCase()]
        withLayers && withLayers(resource, layerProcessor)
    }
    var info;
    var popup;
    // TODO: handle click with overlay
    var onFeatureClick = function (features, pixel) {
            //console.log('feature');
            if (features) {
                feature = features [0];
            }

            var element = popup.getElement();
            //var element = popup;
              var coordinate = pixel;

                $(document.getElementById('popup')).popover('destroy');
                  popup.setPosition(coordinate);
                  //popup.setLatLng([0, 0]);
                    // the keys are quoted to prevent renaming in ADVANCED_OPTIMIZATIONS mode.
                    var text;
                    if (feature['name']) { 
                        text =feature['name'];
                    }
                    else {
                        text = JSON.stringify(feature);
                    }
                       $(element).popover({
                            'placement': 'top',
                            'animation': false,
                            'html': true,
                            'content': text
                        }).attr('data-original-title');

                    $(element).popover('show');

        };


    return {
        options: {
            i18n: {
            }
        },

        initialize: function () {
            jQuery.proxyAll(this, /_on/);
            this.el.ready(this._onReady);
        },

        addLayer: function(resourceLayer) {
            
            var layer = this.map.createLayer(resourceLayer);
            // set map extent on layer bounds
            layer.setLayerExtent();
        
        },

        _onReady: function () {

            var mapDiv = $("<div></div>").attr("id", "map-ol").addClass("map")
            info = $("<div></div>").attr("id", "info")
            popup = $("<div></div>").attr("id", "popup")
            
            mapDiv.append(info)
            mapDiv.append(popup)
            $("#data-preview2").empty()
            $("#data-preview2").append(mapDiv)

            PublicaMundi.noConflict();
            
            var baseLayers = [{
                        title: 'Open Street Maps',
                        type: PublicaMundi.LayerType.TILE,
                        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }];

            var options = {
                target: 'map-ol',
                center: [-985774, 4016449],
                zoom: 1.6,
                projection: 'EPSG:900913',
                layers: baseLayers,
                minZoom: 1,
                maxZoom: 18,
            };
            this.map = PublicaMundi.map(options);
                
            // Popup showing the position the user clicked
            // Need to make this by using the API
            //popup = this.map.addOverlay(document.getElementById('popup'))

            popup = new ol.Overlay({
               element: document.getElementById('popup')
               });
               this.map._map.addOverlay(popup);
                
               $(document.getElementById('map-ol')).click(function() {
                    $(document.getElementById('popup')).popover('destroy');
            });
            //console.log('map');
            //console.log(this.map);
            withLayers(preload_resource, $_.bind(this.addLayer, this))
        }
    }
});
