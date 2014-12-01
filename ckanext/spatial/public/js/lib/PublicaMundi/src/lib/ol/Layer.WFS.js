/// <reference path="../../OpenLayers/build/ol-whitespace.js" />

/// <reference path="../../PublicaMundi.js" />
/// <reference path="../../PublicaMundi.OpenLayers.js" />
/// <reference path="../Layer.js" />

(function (window, PublicaMundi, ol) {
    if (typeof PublicaMundi === 'undefined') {
        return;
    }

    if (typeof ol === 'undefined') {
        return;
    }

    PublicaMundi.define('PublicaMundi.OpenLayers.Layer');

    PublicaMundi.OpenLayers.Layer.WFS = PublicaMundi.Class(PublicaMundi.Layer, {
        update: function() {
                    },
        initialize: function (options) {
            PublicaMundi.Layer.prototype.initialize.call(this, options);
            this._map = null;
            this._type = null;
            var version = options.version ? options.version : '';
            
            
            // Set JSON as preferable transfer format
            var output_format = options.format ? options.format : 'json';
            var format; 

            // Set v2 as default version for GML
            if (output_format =='gml'){
                output_format = 'gml2';
            }
            
            if (output_format == 'json') {
                format = new ol.format.GeoJSON();
            }
            else if (output_format == 'gml32' || output_format == 'gml31' || output_format == 'gml3'){
                format = new ol.format.WFS({
                             //   featureNS: undefined,
                             //  featureType:  undefined, //'og:archsites',
                            gmlFormat: new ol.format.GML3(),
                            extractAttributes: true,
                            resFactor: 1,
                        });
            }
            else if (output_format == 'gml2'){
                format = new ol.format.WFS({
                             //   featureNS: undefined,
                             //  featureType:  undefined,
                            gmlFormat: new ol.format.GML2(),
                            //extractAttributes: true
                        });
            }

            //var version = options.version || '1.0.0';
           var projection = options.projection ? options.projection : 'EPSG:3857'; 
            if (projection == 'EPSG:900913'){
                projection = 'EPSG:3857';
            }
            else if ( projection == 'EPSG:26713'){
                    projection = 'EPSG:3857';
                }
            
            console.log('projection');
            console.log(projection);
            console.log('format');
            console.log(output_format);
            console.log('version');
            console.log(version);
            var vectorSource = new ol.source.ServerVector({
                    format: format,
                    projection: projection,
                    loader: function(extent, resolution, proj) {
                         console.log('proj=');
                         console.log(proj);
                         console.log(projection);
                         console.log('ext=');
                         console.log(extent);
                        $.ajax({
                            type: "GET",
                            //url: options.url+  '?service=WFS&request=GetFeature&typename='+options.name+'&srsname=EPSG:4326&outputFormat=json' +
                            url: options.url+  '?service=WFS&request=GetFeature&typename='+options.name+ '&srsname='+projection + '&outputFormat='+ output_format +  '&bbox=' + extent.join(',')+ ',EPSG:3857' + '&maxFeatures=' + options.maxFeatures + '&version=1.1.0',
                            //'&maxFeatures=' + options.maxFeatures + '&version=' + version 
                            //'&format_options=callback:loadFeatures',
                            //dataType: 'jsonp',
                            //dataType: 'json',
                            //outputFormat: 'json',
                            //dataType: 'xml',
                            
                            //context: this,
                            success: function(response) {
                                //console.log('SUCCESS');
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

            var loadFeatures = function(response) {
                console.log(response);
                //var proj = { dataProjection: 'EPSG:900913', featureProjection: 'EPSG:900913'};
                console.log(projection);
                var proj = { dataProjection: projection, featureProjection: 'EPSG:3857'};
                //var proj = {};
                //console.log(vectorSource.readFeatures(response,  proj));
                //console.log(format.readFeatures(response, proj));
                //console.log(format.readFeatures(response)[0].values_.boundedBy);
                //console.log(format.readFeatures(response , proj));
                //console.log(format.readFeatures(response, proj));
                //vectorSource.addFeatures(format.readFeatures(response, proj));
                console.log(format);
                vectorSource.addFeatures(format.readFeatures(response));
                }

            this._layer = new ol.layer.Vector({
                title: options.title,
                source: vectorSource, 
                visible: options.visible,
                //strategy: ol.loadingstrategy.bbox,
                strategy: ol.loadingstrategy.createTile(new ol.tilegrid.XYZ({
                //    maxZoom: 19,
                //    minZoom: 12
                })),
                //projection: projection,
                projection: 'EPSG:3857',
               // })
            });
        
        
            
        },
        setLayerExtent: function() {
            var layer = this;
            this._layer.once('postcompose', function() {
                console.log(layer._extent);
                layer.getMap().setExtent(layer._extent, 'EPSG:4326');
            });
        },
    });

    PublicaMundi.registry.registerLayerType({
        layer: PublicaMundi.LayerType.WFS,
        framework: PublicaMundi.OpenLayers.Framework,
        type: 'PublicaMundi.Layer.WFS',
        factory: PublicaMundi.OpenLayers.Layer.WFS
    });
})(window, window.PublicaMundi, ol);
