class TileMapRenderer

  @findCoordsForIndex: (index, width) ->
    return {x: ((index-1) % width) + 1, y: Math.ceil(index/width)}

  @renderMapToContext: (map, context) ->
    tileset = new Image()
    tileset.onload = ->
      map = window.game.map
      tileWidth = map.data.tilewidth
      tileHeight = map.data.tileheight
      width = map.data.width
      for y in [1..5]
        for x in [1..5]
          point = map.findPoint({x:x, y:y})
          coords = TileMapRenderer.findCoordsForIndex(point.type, tileset.naturalWidth / tileWidth)
          sx = (coords.x-1)*tileWidth
          sy = (coords.y-1)*tileHeight
          dx = (x-1)*tileWidth
          dy = (y-1)*tileHeight
          context.drawImage(tileset, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight)

    tileset.src = 'img/' + map.data.tilesets[0].image
    return

## export
module.exports = TileMapRenderer