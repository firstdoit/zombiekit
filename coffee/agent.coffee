window.Agent = class Agent
  constructor: (@map) ->
    @position = {x: 1, y: 1}

  nonCollidablePointsFromPoint: (point) ->
    up = {x:point.x, y:point.y-1}
    right = {x:point.x+1, y:point.y}
    down = {x:point.x, y:point.y+1}
    left = {x:point.x-1, y:point.y}
    nonCollidablePoints = []

    nonCollidablePoints.push ncpoint for ncpoint in [up, right, down, left] when @map.findPoint(ncpoint).type is Map.road
    return nonCollidablePoints

  searchNextPoints: -> return @nonCollidablePointsFromPoint(@position)

  findBestRoute: (originPoint, goalPoint) ->
    currentPoint = originPoint
    tree = new Arboreal()

    while currentPoint != goalPoint
      tree.appendChild point for point in @nonCollidablePointsFromPoint currentPoint

      ##Choose the best point to visit next
      for node in tree.children
        if (node.data.visited)
          continue

        betterHeuristic = 100
        betterPoint = {}
        currentHeuristic = @heuristicValue(point, originPoint, goalPoint)
        if (currentHeuristic < betterHeuristic)
          betterPoint = point
          betterHeuristic = currentHeuristic
    ##while

  heuristicValue: (currentPoint, startPoint, goalPoint) ->
    return distanceToGoal(currentPoint, goalPoint) + pathCost(startPoint, currentPoint)

  distanceToGoal: (currentPoint, goalPoint) ->
    return Math.abs(currentPoint.x - goalPoint.x) + Math.abs(currentPoint.y - goalPoint.y)

  pathCost: (originPoint, goalPoint) ->
    return 0
