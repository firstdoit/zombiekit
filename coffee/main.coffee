Zepto ($) ->
  window.game = new Game()
  canvas = $('#canvas')[0]
  ctx = canvas.getContext("2d")
  stage = new createjs.Stage(canvas)
  ###g = new createjs.Graphics()
  g.setStrokeStyle(5)
  g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
  g.drawCircle(0,0, 30)
  circle = new createjs.Shape(g)
  circle.x = canvas.width / 2
  circle.y = canvas.height / 2
  stage.addChild(circle)
  stage.update()###

  findCoordsForIndex = (index, width) ->
    return {x: ((index-1) % width) + 1, y: Math.ceil(index/width)}

  tileset = new Image()
  tileset.onload = ->
    map = window.game.map
    tileWidth = map.data.tilewidth
    tileHeight = map.data.tileheight
    width = map.data.width
    for x in [1..5]
      for y in [1..5]
        point = map.findPoint({x:x, y:y})
        coords = findCoordsForIndex(point.type, tileset.naturalWidth / tileWidth)
        sx = (coords.x-1)*tileWidth
        sy = (coords.y-1)*tileHeight
        dx = (x-1)*tileWidth
        dy = (y-1)*tileHeight
        ctx.drawImage(tileset, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight)

  tileset.src = 'img/Industrial-TileSheet.png'
###createjs.Ticker.setFPS(60)
createjs.Ticker.addListener(window)###

