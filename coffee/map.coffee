Point = require("./point")
class Map
  ##static const
  @road = 109
  @nonCollidable = [502, 496, 497, 445, 188, 508, 442, 443]
  @tiles = {
    food: 188
    water: 442
    guns: 443
    home: 445
    ammo: 508
  }

  constructor: (@data) ->

  layer: (name) -> return (layer for layer in @data.layers when layer.name is name)[0] ? @data.layers[0]

  getTypeForIndex: (index) ->
    ## bug in tiled map editor outputs index-1 for tileproperty key
    @data.tilesets[0].tileproperties[index-1]?['type']

  getCollidableForIndex: (index) ->
    ## bug in tiled map editor outputs index-1 for tileproperty key
    collidable = @data.tilesets[0].tileproperties[index-1]?['collidable']
    if collidable and collidable is "0" then false else true

  getCostForIndex: (index) ->
    @layer('cost').data[index]

  findPoint: (args...) ->
    if args.length is 1
      coords = args[0]
    else
      coords = {x:args[0], y:args[1]}

    ##Some invalid coordinates. Probably off a border.
    return undefined if coords.x < 1 or coords.y < 1 or coords.x > @data.width or coords.y > @layer().data.length / @layer().width

    ##Find the column, then adjust the line, then resolve to 0 based array
    index = ( (coords.y-1) * @data.width + coords.x ) - 1;

    tileIndex = @layer('graphic').data[index]
    cost = @getCostForIndex(tileIndex)
    type = @getTypeForIndex(tileIndex)
    collidable = @getCollidableForIndex(tileIndex)
    return new Point(coords.x, coords.y, cost, type, collidable, tileIndex)

## export
module.exports = Map