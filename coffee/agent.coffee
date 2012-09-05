window.Agent = class Agent
  constructor: (@map) ->
    @position = {x: 1, y: 1}

  nonCollidablePointsFromPoint: (point) ->
    up = {x:point.x, y:point.y-1}
    right = {x:point.x+1, y:point.y}
    down = {x:point.x, y:point.y+1}
    left = {x:point.x-1, y:point.y}
    nonCollidablePoints = []

    nonCollidablePoints.push ncpoint for ncpoint in [up, right, down, left] when @map.pointType(ncpoint) is Map.road
    return nonCollidablePoints

  searchNextPoints: -> return @nonCollidablePointsFromPoint(@position)


