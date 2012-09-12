Q = require("q")

class TileMapRenderer

  @findCoordsForIndex: (index, width) ->
    return {x: ((index-1) % width) + 1, y: Math.ceil(index/width)}

  @renderMapToContext: (map, context) ->
    tileset = new Image()
    deferred = Q.defer()
    tileset.onload = ->
      tileWidth = map.data.tilewidth
      tileHeight = map.data.tileheight
      width = map.data.width
      height = map.data.height
      for y in [1..width]
        for x in [1..height]
          point = map.findPoint({x:x, y:y})
          coords = TileMapRenderer.findCoordsForIndex(point.tileIndex, tileset.naturalWidth / tileWidth)
          sx = (coords.x-1)*tileWidth
          sy = (coords.y-1)*tileHeight
          dx = (x-1)*tileWidth
          dy = (y-1)*tileHeight
          context.drawImage(tileset, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight)

      deferred.resolve(context)

    tileset.src = 'img/' + map.data.tilesets[0].image
    return deferred.promise

## export
module.exports = TileMapRenderer