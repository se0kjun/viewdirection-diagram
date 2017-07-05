'use strict';

var color = {
    rgb2hsv: function(r, g, b, format) {
        var _format = format || 'object',
            _color = {
                _r: r / 255,
                _g: g / 255,
                _b: b / 255
            },
            _max_key = Object.keys(_color).reduce(function(a, b){ return _color[a] > _color[b] ? a : b }),
            _min_key = Object.keys(_color).reduce(function(a, b){ return _color[a] < _color[b] ? a : b }),
            delta = _color[_max_key] - _color[_min_key],
            _h = 60;

        if (_max_key == "_r") {
            _h *= ( ((_color._g - _color._b) / delta) % 6 );
        }
        else if (_max_key == "_g") {
            _h *= ( ((_color._b - _color._r) / delta) + 2 );
        }
        else if (_max_key == "_b") {
            _h *= ( ((_color._r - _color._g) / delta) + 4 );
        }

        if (_format == 'object')
            return {
                h: (delta == 0) ? 0 : _h,
                s: (_color[_max_key] == 0) ? 0 : delta / _color[_max_key],
                v: _color[_max_key]
            };
    },
    hsv2rgb: function(h, s, v, format) {
        var _format = format || 'hex',
            _h = (h < 0) ? h + 360 : h,
            _color = {
                _r: 0,
                _g: 0,
                _b: 0
            };

        var C = s * v,
            X = C * (1 - Math.abs( ((_h / 60) % 2) - 1 )),
            m = v - C;

        if (_h >= 0 && _h < 60) {
            _color._r = C;
            _color._g = X;
        }
        else if (_h >= 60 && _h < 120) {
            _color._r = X;
            _color._g = C;
        }
        else if (_h >= 120 && _h < 180) {
            _color._g = C;
            _color._b = X;
        }
        else if (_h >= 180 && _h < 240) {
            _color._g = X;
            _color._b = C;
        }
        else if (_h >= 240 && _h < 300) {
            _color._r = X;
            _color._b = C;
        }
        else if (_h >= 300 && _h < 360) {
            _color._r = C;
            _color._b = X;
        }

        if (_format == 'object')
            return {
                r: (_color._r + m) * 255,
                g: (_color._g + m) * 255,
                b: (_color._b + m) * 255
            }
        else if (_format == 'hex') {
            return "#" + ((1 << 24) + (Math.floor((_color._r + m) * 255) << 16) + (Math.floor((_color._g + m) * 255) << 8) + Math.floor((_color._b + m) * 255)).toString(16).slice(1);
        }
    }
};

// data format: json
//[
//    {
//        direction: (float),
//        time: (float)
//    },
//    ....
//]
// precision: 1, 0.5 ...
function diagram_data(data, precision, options) {
    this.data = data;
    this.precision = precision;
    this.lookup_data = new Array(360 / precision);
    this.options = options;
    this.lookup_data.fill(0);

    this.init();
}

diagram_data.prototype = {
    init: function() {
        this.data.forEach(function(elem) {
            if (elem.direction > 0)
                this.lookup_data[Math.floor((elem.direction - (Math.floor(elem.direction / 360) * 360)) / this.precision)]++;
            else
                this.lookup_data[Math.floor((elem.direction - (Math.floor(elem.direction / 360) * 360)) / this.precision)]++;
        }, this);
    },
    // hue value: low and high
    normalize_hue: function(low, high) {
        var max = this.lookup_data.reduce(function(prev, curr) {
            return Math.max(prev, curr);
        }, this.lookup_data[0]);
        
        return this.lookup_data.map(function(elem) {
            return (high-low) * (1- (elem/max));
        });
    },
    // hue value range: low and high
    // saturation, brightness
    normalize_to_rgb: function(low, high, saturation, brightness) {
        var max = this.lookup_data.reduce(function(prev, curr) {
            return Math.max(prev, curr);
        }, this.lookup_data[0]);
        
        return this.lookup_data.map(function(elem) {
            var tmp = (high-low) * (1- (elem/max));
            return color.hsv2rgb(tmp, saturation, brightness, "hex");
        });
    },
    draw: function(svg_ctx) {
        var start_angle = 0;
        var color_data = this.normalize_to_rgb(this.options.low, this.options.high, this.options.saturation, this.options.brightness);
        
        color_data.forEach(function(elem) {
            var arc = d3.arc()
            .innerRadius(this.options.inner_radius)
            .outerRadius(this.options.outer_radius)
            .startAngle(start_angle * (Math.PI/180))
            .endAngle((start_angle + this.precision) * (Math.PI/180));

            svg_ctx.append('path')
            .attr('d', arc)
            .attr('fill', elem)
            .attr('transform', 'translate(' + svg_ctx.attr('width')/2 + ',' + svg_ctx.attr('height')/2 + ')');
            
            start_angle += this.precision;
        }, this);
        
        var rect_width = (this.options.inner_radius * 2) / Math.sqrt(2);
        
        svg_ctx.append('image')
        .attr("xlink:href", './res/head.png')
        .attr('x', (svg_ctx.attr('width')/2) - (rect_width/2))
        .attr('y', (svg_ctx.attr('height')/2) - (rect_width/2))
        .attr('width', rect_width)
        .attr('height', rect_width);
        
        this.draw_legend(svg_ctx);
    },
    draw_legend(svg_ctx) {
        for (var i  =0 ;i<100; i++) {
            var clr = color.hsv2rgb(((this.options.high - this.options.low) / 100) * i + this.options.low, this.options.saturation, this.options.brightness, 'hex');
            
            svg_ctx.append('rect')
            .attr('x', (svg_ctx.attr('width') * 0.9))
            .attr('y', (svg_ctx.attr('height') * 0.05) + i)
            .attr('width', '40px')
            .attr('height', '1px')
            .attr('fill', clr);
        }
    }
}

window.addEventListener('load', function() {
    var diagram_config = {
        outer_radius: 200,
        inner_radius: 100,
        saturation: 0.95,
        brightness: 0.95,
        low: 0,
        high: 120
    };
    
    var svg_context = d3.select('#viewpoint-diagram')
    .append('svg')
    .attr('width', 700)
    .attr('height', 700);
    
    $.getJSON('./data/video2/physical_2017_01_22_19_13_03__0video2.json', function(data) {
        console.log("test");
        var a = new diagram_data(data, 5, diagram_config);
        console.log("test2");
        a.draw(svg_context);
        console.log("test3");
    });
});
