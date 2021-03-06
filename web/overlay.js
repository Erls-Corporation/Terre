function DrawOverlay(map,opts) { 

	var self = this; 
	
	//Options
	this.opts = jQuery.extend({
		'brushSize' : 40,
		'brushes' : {},
		'opacity' : 1,
		'precision' : 7
	},opts);
	
	//Points
	this.points = {};
	
	//Map
	this.map = map;
	this.setValues({'map': map});
	this.zoom = this.map.getZoom();
	this.bounds = this.map.getBounds();
	this.drawing = false;
	
	//Create controls
	this.initControls();
	
	//Create canvas layer
	this.initCanvas();
	
	//Preload brushes
	this.initBrushes();
	
	//Events
	this.initEvents();
	
	//Init Socket
	this.initSocket();
	
};  
  
DrawOverlay.prototype = new google.maps.OverlayView; 

DrawOverlay.prototype.initControls = function() {
	
	var self = this;
	
	this.controls = $('#controls').clone();
	$('#controls').remove();
	
	this.controls.find('li.drag a, li.flower a').click(function(self) {
		
		return function(e) {
			e.preventDefault();
			var $li = $(this).parents('li');
			if(!$li.is('.down')) {
				$('#controls li.down').removeClass('down');
				$li.addClass('down');
				if($li.is('.flower')) {
					self.drawing = true;
					self.map.setOptions({'draggable':false});
					self.markerLayer.removeClass('drawing');
				} else {
					self.drawing = false;
					self.map.setOptions({'draggable':true});
					self.markerLayer.addClass('drawing');
				}
			}
		}
		
	}(this));
	
	this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(this.controls.get(0));
	
};

DrawOverlay.prototype.initCanvas = function() {
	
	var self = this;
	
	var width = $(window).width();
	var height = $(window).height();
	this.markerLayer = $('<div><canvas width="'+width+'" height="'+height+'"></canvas></div>');  
	this.markerLayer.addClass('overlay');
	this.markerLayer.addClass('drawing');
	this.markerLayer.css({
		'width' : '100%',
		'height' : '100%'
	});
	this.canvas = this.markerLayer.find('canvas').get(0);
	this.canvasContext = this.canvas.getContext('2d');
	this.canvasContext.globalAlpha = this.opts.opacity;
	
};

DrawOverlay.prototype.initBrushes = function() {
	
	var self = this;
	
	this.brushes = {};
	for(var key in this.opts.brushes) {
		var brushes = this.opts.brushes[key] instanceof Array ? this.opts.brushes[key]:[this.opts.brushes[key]];
		this.brushes[key] = {
			'index' : 0,
			'images' : []
		};
		for(var i = 0; i < brushes.length; i++) {
			var img = new Image();
			img.src = brushes[i];
			this.brushes[key].images[i] = img;
		}
	}
	
};

DrawOverlay.prototype.initEvents = function() {
	
	var self = this;
	
	google.maps.event.addListener(this.map, 'bounds_changed', function(e) {
		self.bounds = this.getBounds();
	});
	google.maps.event.addListener(this.map, 'zoom_changed', function(e) {
		self.zoom = this.getZoom();
	});
	google.maps.event.addListener(this.map, 'dragstart', function(e) {
		$(self.canvas).css('opacity', 0.3);
	});
	google.maps.event.addListener(this.map, 'dragend', function(e) {
		if(!self.drawing) {
			window.setTimeout(function() {
				$(self.canvas).css('opacity', 1);
				self.draw();
			},300);
		}
	});
	
	var mouseIsDown = false;
	var drawTimer;
	function drawFlower(latLng) {
		if(!self.drawing || !mouseIsDown) return;
		if(!drawTimer) {
			drawTimer = window.setTimeout(function(latLng) {
				return function() {
					self.addPointAndDraw({
						'latLng' : latLng,
						'brush' : 'flower'
					});
					drawTimer = null;
				}
			}(latLng),75);
		}
	}
	google.maps.event.addListener(this.map, 'mousedown', function(e) {
		mouseIsDown = true;
	});
	google.maps.event.addListener(this.map, 'mouseup', function(e) {
		mouseIsDown = false;
	});
	google.maps.event.addListener(this.map, 'mousemove', function(e) {
		drawFlower(e.latLng);
	});
	google.maps.event.addListener(this.map, 'mouseover', function(e) {
		drawFlower(e.latLng);
	});
};

DrawOverlay.prototype.initSocket = function() {
	
	this.socket = io.connect('http://terre.commun.ca');
	this.socket.on('drawPoints', function(self) {
		return function (points) {
			//console.log('a');
			for(var i = 0; i < points.length; i++) {
				self.addPointAndDraw(points[i],false);
			}
		}
	}(this));
	
};

DrawOverlay.prototype.onAdd = function() {  

	var self = this;
	var $pane = $(this.getPanes().overlayImage);
	
	function eventHandler(e,touch) {
		if(typeof(touch) == 'undefined') {
			var touch = false;
		}
		var evt = document.createEvent('MouseEvents');
		evt.initMouseEvent(e.type, true, true, window, 0, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, $pane.parent().get(0));
		$pane.parent().get(0).dispatchEvent(evt);
	}
	
	this.markerLayer.bind('mouseover',eventHandler);
	this.markerLayer.bind('mouseout',eventHandler);
	this.markerLayer.bind('mousemove',eventHandler);
	this.markerLayer.bind('mouseup',eventHandler);
	this.markerLayer.bind('mousedown',eventHandler);
	this.markerLayer.bind('click',eventHandler);
	this.markerLayer.bind('dblclick',eventHandler);
	this.markerLayer.bind('touchmove',function(e) {
		e.type = 'mousemove';
		eventHandler(e,true);
	});
	this.markerLayer.bind('touchstart',function(e) {
		e.type = 'mouseover';
		eventHandler(e,true);
	});
	this.markerLayer.bind('touchend',function(e) {
		e.type = 'mouseover';
		eventHandler(e);
		if(!self.drawing) {
			self.draw();
		}
	});
	
	$pane.append( '<div class="placeholder"></div>' );
	$pane.parent().parent().append( this.markerLayer );
	
};  
  
DrawOverlay.prototype.onRemove = function() {  
    this.markerLayer.remove();  
}; 

DrawOverlay.prototype.draw = function() {
	
	//console.log('draw');
	
	//Clear canvas
	var width = $(this.canvas).width();
	var height = $(this.canvas).height();
	this.canvasContext.clearRect(0,0,width,height);
    
	//Draw points
	var bounds = this.map.getBounds();
	var self = this;
	this.getPointsInBounds(bounds,function(points) {
		//console.log('draw',points.length);
		for(var i = 0; i < points.length; i++) {
			self.drawPoint(points[i]);
		}
	});
};  

DrawOverlay.prototype.getPointsInBounds = function(bounds,cb) {
	
	var ne = bounds.getNorthEast();
	var sw = bounds.getSouthWest();
	
	var mathFncNeLat = ne.lat() < 0 ? Math.ceil:Math.floor;
	var mathFncNeLng = ne.lng() < 0 ? Math.ceil:Math.floor;
	var mathFncSwLat = sw.lat() < 0 ? Math.ceil:Math.floor;
	var mathFncSwLng = sw.lng() < 0 ? Math.ceil:Math.floor;
	
	var startRow = ne.lat() <= sw.lat() ? mathFncNeLat(ne.lat()):mathFncSwLat(sw.lat());
	var endRow = ne.lat() >= sw.lat() ? mathFncNeLat(ne.lat()):mathFncSwLat(sw.lat());
	var startCol = ne.lng() <= sw.lng() ? mathFncNeLng(ne.lng()):mathFncSwLng(sw.lng());
	var endCol = ne.lng() >= sw.lng() ? mathFncNeLng(ne.lng()):mathFncSwLng(sw.lng());
	
	var notfound = false;
	var points = [];
	for(var row = startRow; row < (endRow+1); row++) {
		for(var col = startCol; col < (endCol+1); col++) {
			if(typeof(this.points[row]) != 'undefined' && typeof(this.points[row][col]) != 'undefined') {
				points = points.concat(this.points[row][col]);
			} else {
				notfound = true;
				this.ensureSpace(row,col);
			}
		}
	}
	
	if(notfound) {
		this.socket.emit('getPoints',{
			'ne' : {
				'lat' : ne.lat(),
				'lng' : ne.lng()
			},
			'sw' : {
				'lat' : sw.lat(),
				'lng' : sw.lng()
			}
		},this.zoom,function (cb,self) {
			return function(data) {
				var points = [];
				for(var key in data) {
					var point = new DrawOverlay.Point({
						'lat' : data[key][0],
						'lng' : data[key][1],
						'brush' : data[key][2]
					});
					points.push(point);
					self.addPoint(point,false);
				}
				cb.call(self,points);
			}
		}(cb,this));
	
	} else {
		
		var zoomFactor = (this.zoom-7)/8;
		if(zoomFactor < 0.15) zoomFactor = 0.15;
		var precision = Math.pow(10,Math.round(zoomFactor*8));
		
		var keyExists = {};
		var filteredPoints = [];
		for(var i = 0; i < points.length; i++) {
			var point = points[i];
			var key = (Math.floor(point.lat*precision)/precision)+'_'+(Math.floor(point.lng*precision)/precision);
			if(!keyExists[key]) {
				keyExists[key] = true;
				filteredPoints.push(points[i]);
			}
		}
		keyExists = null;
		
		cb.call(this,filteredPoints);
	}
};


DrawOverlay.prototype.drawPoint = function(point) { 

	//Check if point is in mab bounds
 	if(!this.bounds.contains(point.latLng)) return false;
	
	var projection = this.getProjection();  
    var zoom = this.getMap().getZoom()/19;

	//Get coordinates on screen
	var coords = projection.fromLatLngToContainerPixel(point.latLng);
	
	//Draw point on canvas using the current brush
	var brush = this.brushes[point.brush];
	var size = Math.floor(this.opts.brushSize*zoom);
	this.canvasContext.drawImage(brush.images[brush.index],coords.x,coords.y,size,size);
	
	//Alternate brush
	brush.index = brush.index < (brush.images.length-1) ? (brush.index+1):0;
}; 

DrawOverlay.prototype.ensureSpace = function(row,col) {
	if(typeof(this.points[row]) == 'undefined') {
		this.points[row] = {};
	}
	if(typeof(this.points[row][col]) == 'undefined') {
		this.points[row][col] = [];
	}
};

DrawOverlay.prototype.addPoint = function(point,emit) { 
 
 	if(typeof(emit) == 'undefined') var emit = true;
 	
	//Create point object
	var point = new DrawOverlay.Point(point);
	
	//Ensure space for points
	this.ensureSpace(point.row,point.col);
	
	//Add point
    this.points[point.row][point.col].push(point);
	
	//Emit if needed
	if(emit) {
		this.socket.emit('addPoints',[point.getAsObject()]);
	}
	
	return point;
	
};

DrawOverlay.prototype.addPointAndDraw = function(point,emit) { 
 
 	if(typeof(emit) == 'undefined') var emit = true;
 	
	point = this.addPoint(point,emit);
	
	//Draw point
	this.drawPoint(point);
	
};

DrawOverlay.prototype.addPoints = function(points,emit) { 
 
 	if(typeof(emit) == 'undefined') var emit = true;
 	
	for(var i = 0; i < points.length; i++) {
		this.addPoint(points[i],emit);
	}
	
};


/*
 *
 * Point
 *
 */
DrawOverlay.Point = function(point) {
	
	var point = jQuery.extend({
		'precision' : 5
	},point);
	
	this.brush = point.brush;
	
	var precision = Math.pow(10,point.precision);
	
	var lat = typeof(point.latLng) == 'undefined' ? point.lat:point.latLng.lat();
	var lng = typeof(point.latLng) == 'undefined' ? point.lng:point.latLng.lng();
	
	var mathFncLat = lat < 0 ? Math.ceil:Math.floor;
	var mathFncLng = lng < 0 ? Math.ceil:Math.floor;
	
	this.lat = mathFncLat(lat*precision)/precision;
	this.lng = mathFncLng(lng*precision)/precision;
	this.latLng = typeof(point.latLng) == 'undefined' ? new google.maps.LatLng(this.lat,this.lng):point.latLng;
	
	this.row = mathFncLat(this.lat);
	this.col = mathFncLng(this.lng);
	
};

DrawOverlay.Point.prototype.getAsObject = function() {
	return {
		'lat' : this.lat,
		'lng' : this.lng,
		'brush' : this.brush,
		'row' : this.col,
		'col' : this.row
	};
}