class Point
  constructor: (@x, @y, @cost, @type) ->
    @cost = @cost ? 1
    @visited = false
    ## If this point belongs to a path, the index in the path.
    @pathIndex = undefined

  equals: (point) ->
    result = point.x == @x and point.y == @y and point.cost == @cost and point.type == @type
    ##console.log('this:', @x, @y, 'new:', point.x, point.y, 'result:', result)
    return result

  toString: -> "(" + @x + "," + @y + ")"

## export
module.exports = Point