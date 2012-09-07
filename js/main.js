(function() {

  Zepto(function($) {
    var canvas, ctx, findCoordsForIndex, stage, tileset;
    window.game = new Game();
    canvas = $('#canvas')[0];
    ctx = canvas.getContext("2d");
    stage = new createjs.Stage(canvas);
    /*g = new createjs.Graphics()
    g.setStrokeStyle(5)
    g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
    g.drawCircle(0,0, 30)
    circle = new createjs.Shape(g)
    circle.x = canvas.width / 2
    circle.y = canvas.height / 2
    stage.addChild(circle)
    stage.update()
    */

    findCoordsForIndex = function(index, width) {
      return {
        x: ((index - 1) % width) + 1,
        y: Math.ceil(index / width)
      };
    };
    tileset = new Image();
    tileset.onload = function() {
      var coords, dx, dy, map, point, sx, sy, tileHeight, tileWidth, width, x, y, _i, _results;
      map = window.game.map;
      tileWidth = map.data.tilewidth;
      tileHeight = map.data.tileheight;
      width = map.data.width;
      _results = [];
      for (x = _i = 1; _i <= 5; x = ++_i) {
        _results.push((function() {
          var _j, _results1;
          _results1 = [];
          for (y = _j = 1; _j <= 5; y = ++_j) {
            point = map.findPoint({
              x: x,
              y: y
            });
            coords = findCoordsForIndex(point.type, tileset.naturalWidth / tileWidth);
            sx = (coords.x - 1) * tileWidth;
            sy = (coords.y - 1) * tileHeight;
            dx = (x - 1) * tileWidth;
            dy = (y - 1) * tileHeight;
            _results1.push(ctx.drawImage(tileset, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight));
          }
          return _results1;
        })());
      }
      return _results;
    };
    return tileset.src = 'img/Industrial-TileSheet.png';
  });

  /*createjs.Ticker.setFPS(60)
  createjs.Ticker.addListener(window)
  */


}).call(this);
