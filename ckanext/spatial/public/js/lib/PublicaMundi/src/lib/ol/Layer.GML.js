/// <reference path="../../OpenLayers/build/ol-whitespace.js" />

/// <reference path="../../PublicaMundi.js" />
/// <reference path="../Layer.js" />

(function (global, PublicaMundi, ol) {
    if (typeof PublicaMundi === 'undefined') {
        return;
    }

    if (typeof ol === 'undefined') {
        return;
    }

    PublicaMundi.define('PublicaMundi.OpenLayers.Layer');

    PublicaMundi.OpenLayers.Layer.GML = PublicaMundi.Class(PublicaMundi.Layer, {
        
        initialize: function (options) {
            PublicaMundi.Layer.prototype.initialize.call(this, options);

           
            var projection = options.projection ? options.projection : 'EPSG:3857'; 

            if (projection == 'EPSG:900913'){
                projection = 'EPSG:3857';
            }
            else if ( projection == 'EPSG:26713'){
                    projection = 'EPSG:3857';
                }
            console.log('prok');
            console.log(projection);
            
            var format = new ol.format.WFS({
                                    //featureNS: (options.featureNS ? layer.featureNS : undefined),
                                    //featureType: (options.featureType ? layer.featureType : undefined),
                                    gmlFormat: new ol.format.GML3()
                    });

            var vectorSource = new ol.source.ServerVector({
                    //format: new ol.format.GeoJSON(),
                    format: format,
                    projection: projection,
                    //projection: 'EPSG:3857',
                     //url: options.url,
                loader: function(extent, resolution, proj) {
                        console.log('proj=');
                        console.log(proj);
                        console.log(projection);
                        console.log('ext=');
                        console.log(extent);
                    $.ajax({
                        type: "GET",
                        url: options.url,
                        //url: options.url+  '?service=WFS&request=GetFeature&typename='+options.name+'&srsname=EPSG:4326&outputFormat=json' +
                        //url: options.url+  '?service=WFS&request=GetFeature&typename='+options.name+ '&srsname='+projection + '&outputFormat='+ output_format +  '&bbox=' + extent.join(',')+ ',EPSG:3857' + '&maxFeatures=' + options.maxFeatures + '&version=1.1.0',
                        //'&maxFeatures=' + options.maxFeatures + '&version=' + version 
                        //'&format_options=callback:loadFeatures',
                        //dataType: 'jsonp',
                        //dataType: 'json',
                        //outputFormat: 'json',
                        //dataType: 'xml',
                        
                        //context: this,
                        success: function(response) {
                            console.log('SUCCESS');
                            //console.log(response);
                            loadFeatures(response);
                        },
                        failure: function(response) {
                            //console.log('FAILURE');
                            //console.log(response);
                        }
                    } )

                     },
                    });

            this._layer = new ol.layer.Vector({
                title: options.title,
                source: vectorSource, 
                //visible: options.visible,
                visible: true,
                //strategy: ol.loadingstrategy.bbox,
                projection: projection,
                });

            var loadFeatures = function(response) {
                console.log('readfeatures');
                console.log(response);
                //var proj = { dataProjection: 'EPSG:900913', featureProjection: 'EPSG:900913'};
                console.log(projection);
                var proj = { dataProjection: 'EPSG:2100', featureProjection: 'EPSG:2100'};
                //var proj = {};
                //console.log(vectorSource.readFeatures(response,  proj));
                //console.log(vectorSource.readFeatures(response));
                //vectorSource.addFeatures(vectorSource.readFeatures(response));
                console.log(format.readFeatures(response, proj));
                vectorSource.addFeatures(format.readFeatures(response, proj));
                }


                //projection:
                //strategy: ol.loadingstrategy.createTile(new ol.tilegrid.XYZ({
                //    maxZoom: 19,
                    //minZoom: 8
                //})),
                //projection: 'EPSG:4326'
               // })
           // });
        
        
            




        },
        setLayerExtent: function() {
            var layer = this;
            this._layer.once('postcompose', function() {
                layer._extent = this.getSource().getExtent();
                layer.getMap().setExtent(layer._extent, 'EPSG:3857');
            });
        },

    });

    PublicaMundi.registry.registerLayerType({
        layer: PublicaMundi.LayerType.GML,
        framework: PublicaMundi.OpenLayers.Framework,
        type: 'PublicaMundi.Layer.GML',
        factory: PublicaMundi.OpenLayers.Layer.GML
    });

    // Add utility methods
    if (PublicaMundi.isDefined(PublicaMundi.Map)) {
        PublicaMundi.Map.prototype.GML = function (options) {
            options.type = options.type || PublicaMundi.LayerType.GML;

            this.createLayer(options);
        };
    }
})(window, window.PublicaMundi, ol);
