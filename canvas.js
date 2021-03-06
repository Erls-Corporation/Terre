var Canvas = module.exports = {
	
	'data' : {},
	'precision' : 8,
	
	'addPoint' : function(point) {
		
		if(typeof(Canvas.data[point.row]) == 'undefined') {
			Canvas.data[point.row] = {};
		}
		
		if(typeof(Canvas.data[point.row][point.col]) == 'undefined') {
			Canvas.data[point.row][point.col] = [];
		}
		
		Canvas.data[point.row][point.col].push(point);
		
	},
	
	
	'getPointsInBounds' : function(bounds,zoom) {
		
		var mathFncNeLat = bounds.ne.lat < 0 ? Math.ceil:Math.floor;
		var mathFncNeLng = bounds.ne.lng < 0 ? Math.ceil:Math.floor;
		var mathFncSwLat = bounds.sw.lat < 0 ? Math.ceil:Math.floor;
		var mathFncSwLng = bounds.sw.lng < 0 ? Math.ceil:Math.floor;
		
		var startRow = bounds.ne.lat <= bounds.sw.lat ? mathFncNeLat(bounds.ne.lat):mathFncSwLat(bounds.sw.lat);
		var endRow = bounds.ne.lat >= bounds.sw.lat ? mathFncNeLat(bounds.ne.lat):mathFncSwLat(bounds.sw.lat);
		var startCol = bounds.ne.lng <= bounds.sw.lng ? mathFncNeLng(bounds.ne.lng):mathFncSwLng(bounds.sw.lng);
		var endCol = bounds.ne.lng >= bounds.sw.lng ? mathFncNeLng(bounds.ne.lng):mathFncSwLng(bounds.sw.lng);
		
		//console.log(startRow,endRow);
		//console.log(startCol,endCol);
		
		var zoomFactor = (zoom-7)/8;
		if(zoomFactor < 0.2) zoomFactor = 0.2;
		var precision = Math.pow(10,Math.round(zoomFactor*8));
		
		var points = [];
		var keyExists = {};
		for(var row = startRow; row < (endRow+1); row++) {
			for(var col = startCol; col < (endCol+1); col++) {
				if(typeof(Canvas.data[row]) != 'undefined' && typeof(Canvas.data[row][col]) != 'undefined') {
					
					//Filter points
					var currentPoints = Canvas.data[row][col];
					for(var i = 0; i < currentPoints.length; i++) {
						var point = currentPoints[i];
						var key = (Math.floor(point.lat*precision)/precision)+'_'+(Math.floor(point.lng*precision)/precision);
						if(!keyExists[key]) {
							keyExists[key] = true;
							points.push(point);
						}
					}
					
				}
			}
		}
		keyExists = null;
		
		return points;
		
	}
	
	
	
	
};



Canvas.point = function(lat,lng,brush) {
	
	var precision = Math.pow(10,Canvas.precision);
	
	var mathFncLat = lat < 0 ? Math.ceil:Math.floor;
	var mathFncLng = lng < 0 ? Math.ceil:Math.floor;
	
	this.lat = mathFncLat(lat*precision)/precision;
	this.lng = mathFncLng(lng*precision)/precision;
	this.brush = brush;
	
	this.row = mathFncLat(this.lat);
	this.col = mathFncLng(this.lng);
	
};