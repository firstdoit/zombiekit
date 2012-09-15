Point = require("./point")
class Path
  constructor: (points) ->
    ##clone the array instead of maintaining a referece to the parameter
    newPoints = []
    newPoints.push $.extend(true, {}, point) for point in points
    @points = newPoints
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
    return Path.keyFromPoints([firstPoint, lastPoint])

  nextPoint: (point) ->
    return @points[point.pathIndex + 1] ? point

  reverse: ->
    @points = @points.reverse()
    return @

  addPath: (path) ->
    lastPoint = @points[@points.length - 1]
    slice = 0
    ## only add contiguous paths
    if lastPoint
      if not lastPoint.equals path.points[0]
        return
      slice = 1
    @points = @points.concat path.points[slice..]
    @resetIndexes()

  cost: ->
    sum = 0
    sum += point.cost for point in @points
    return sum

  ## static
  @keyFromPoints: (twoPoints) ->
    firstPoint = twoPoints[0]
    lastPoint = twoPoints[1]
    return firstPoint.toString() + lastPoint.toString()

  @pathFromPoints: (points, paths) ->
    tour = new Path([])
    for point, i in points
      if i < points.length - 1
        key = Path.keyFromPoints(points[i..i+1])
        tour.addPath paths[key]
    return tour

## export
module.exports = Path