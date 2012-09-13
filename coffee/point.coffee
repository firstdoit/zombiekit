class Point
  constructor: (@x, @y, @cost, @type, @collidable, @tileIndex) ->
    @cost = @cost ? 1
    @visited = false
    ## If this point belongs to a path, the index in the path.
    @pathIndex = undefined

  equals: (point) ->
    result = (point.x is @x) and (point.y is @y)
    ##console.log('this:', @x, @y, 'new:', point.x, point.y, 'result:', result)
    return result

  toString: -> "(" + @x + "," + @y + ")"

## export
module.exports = Point