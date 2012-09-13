Point = require("./point")
class Map
  ##static const
  @costsInMin =
    1: 3
    2: 8
    3: 14
    4: 20
    5: 30

  constructor: (@data) ->

  layer: (name) -> return (layer for layer in @data.layers when layer.name is name)[0] ? @data.layers[0]

  getTypeProperty: (type) ->
    ## bug in tiled map editor outputs index-1 for tileproperty key
    @data.tilesets[0].tileproperties[type-1]?['type']

  getCollidableProperty: (index) ->
    ## bug in tiled map editor outputs index-1 for tileproperty key
    collidable = @data.tilesets[0].tileproperties[index-1]?['collidable']
    if collidable and collidable is "0" then false else true

  getCostForIndex: (index) ->
    Map.costsInMin[@layer('cost').data[index]] ? 0

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
    cost = @getCostForIndex(index)
    type = @getTypeProperty(tileIndex)
    collidable = @getCollidableProperty(tileIndex)
    return new Point(coords.x, coords.y, cost, type, collidable, tileIndex)

## export
module.exports = Map