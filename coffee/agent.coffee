window.Agent = class Agent
  constructor: (@map) ->
    @position = {x: 1, y: 1}

  nonCollidablePointsFromPoint: (point) ->
    up = @map.findPoint({x:point.x, y:point.y-1})
    right = @map.findPoint({x:point.x+1, y:point.y})
    down = @map.findPoint({x:point.x, y:point.y+1})
    left = @map.findPoint({x:point.x-1, y:point.y})
    nonCollidablePoints = []

    nonCollidablePoints.push ncpoint for ncpoint in [up, right, down, left] when ncpoint?.type is Map.road
    return nonCollidablePoints

  searchNextPoints: -> return @nonCollidablePointsFromPoint(@position)

  findBestRoute: (originPoint, goalPoint) ->
    currentPoint = originPoint
    currentPoint.visited = true;
    treeHead = tree = new Arboreal(null, currentPoint)
    bestRoute = []

    while not currentPoint.equals goalPoint
      for point in @nonCollidablePointsFromPoint currentPoint
        if tree.parent?.data.equals point
          point.visited = true
        tree.appendChild point

      ##console.log point for point in @nonCollidablePointsFromPoint currentPoint

      ##tree.traverseDown( (node) -> console.log node )

      ##Fill the unvisitedPoints array
      unvisitedPoints = []
      treeHead.traverseDown( (node) -> unvisitedPoints.push(node.data) if !node.data.visited )
      betterPoint = unvisitedPoints[0]
      betterHeuristic = @heuristicValue(betterPoint, originPoint, goalPoint)
      ##tree.traverseDown( (node) -> console.log node )

      ##Choose the best point to visit next
      for point in unvisitedPoints
        point.visited = true;
        nodeHeuristic = @heuristicValue(point, originPoint, goalPoint)
        if (nodeHeuristic < betterHeuristic)
          betterPoint = point
          betterHeuristic = nodeHeuristic

      currentPoint = betterPoint
      console.log betterPoint, betterHeuristic
      ##Atualiza o nó atual da arvore
      tree = tree.find( (node) -> node.data == currentPoint )
    ##while

    while tree
      bestRoute.push(tree?.data.toString())
      tree = tree.parent

    return bestRoute


  heuristicValue: (currentPoint, startPoint, goalPoint) ->
    return @distanceToGoal(currentPoint, goalPoint) + @pathCost(startPoint, currentPoint)

  distanceToGoal: (currentPoint, goalPoint) ->
    return Math.abs(currentPoint.x - goalPoint.x) + Math.abs(currentPoint.y - goalPoint.y)

  pathCost: (originPoint, goalPoint) ->
    return 0
