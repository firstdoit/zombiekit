Point = require("./point")
class Path
  constructor: (points) ->
    ##clone the array instead of maintaining a referece to the parameter
    @points = [].concat(points)
    @resetIndexes()

  ## initializes the index in each point
  resetIndexes: ->
    point.pathIndex = i for point, i in @points

  cost: ->
    sum = 0
    sum = sum + point.cost for point in @points
    return sum

  toString: ->
    string = ""
    string = string + point.toString() + " " for point in @points
    return string

  key: ->
    firstPoint = @points[0]
    lastPoint = @points[@points.length - 1]
    return firstPoint.toString() + lastPoint.toString()

  nextPoint: (point) ->
    return @points[point.pathIndex + 1] ? point

  reverse: ->
    @points = @points.reverse()
    return @

  addPath: (path) ->
    lastPoint = @points[@points.length - 1]
    ## only add contiguous paths
    if not lastPoint.equals path.points[0]
      return
    @points = @points.concat path.points[1..]
    @resetIndexes()

  ## static
  @keyFromPoints: (twoPoints) ->
    return new Path(twoPoints).key()

## export
module.exports = Path