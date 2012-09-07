window.Agent = class Agent
  constructor: (@map) ->
    @position = {x: 1, y: 1}

  ## Find the nonCollidable points dirrectly adjacent from the given point
  nonCollidablePointsFromPoint: (point) ->
    up = @map.findPoint({x:point.x, y:point.y-1})
    right = @map.findPoint({x:point.x+1, y:point.y})
    down = @map.findPoint({x:point.x, y:point.y+1})
    left = @map.findPoint({x:point.x-1, y:point.y})
    nonCollidablePoints = []

    nonCollidablePoints.push ncpoint for ncpoint in [up, right, down, left] when ncpoint?.type is Map.road
    return nonCollidablePoints

  ## A* implementation
  findBestRoute: (originPoint, goalPoint) ->
    ## Initialize our current point
    currentPoint = originPoint
    currentPoint.visited = true;
    ## Create two tree node variables - head and current
    treeHead = treeCurrentNode = new Arboreal(null, currentPoint)
    ## The array for the best route
    bestRoute = []

    ## While we haven't found the goal point
    while not currentPoint.equals goalPoint
      ## For each navigable point, append it to the current tree node.
      for point in @nonCollidablePointsFromPoint currentPoint
        ## If it's the parent, mark it as visited
        if treeCurrentNode.parent?.data.equals point
          point.visited = true
        treeCurrentNode.appendChild point

      ##Fill the unvisitedPoints array
      unvisitedPoints = []
      treeHead.traverseDown( (node) -> unvisitedPoints.push(node.data) if !node.data.visited )

      ## Initialize our best point in this round
      bestPoint = unvisitedPoints[0]
      bestPointHeuristicValue = @heuristicValue(bestPoint, goalPoint, treeHead)

      ##Choose the best point to visit next from the rest of the unvisited points
      for point in unvisitedPoints[1..]
        pointHeuristicValue = @heuristicValue(point, goalPoint, treeHead)
        if (pointHeuristicValue < bestPointHeuristicValue)
          bestPoint = point
          bestPointHeuristicValue = pointHeuristicValue

      ## Lest visit the best point next
      currentPoint = bestPoint
      currentPoint.visited = true;
      ## Update the current tree node
      treeCurrentNode = treeHead.find( (node) -> node.data == currentPoint )
    ## end while

    ## Construct the best route from the bottom of the tree to the head
    while treeCurrentNode
      bestRoute.push(treeCurrentNode?.data.toString())
      treeCurrentNode = treeCurrentNode.parent

    return bestRoute.reverse()

  ## Calculate the heuristic value of this point, given a goal point and a points tree
  heuristicValue: (point, goalPoint, treeHead) ->
    return @distanceToPoint(point, goalPoint) + @pathCost(point, treeHead)

  ## Calculate the Manhattan distance from pointA to pointB
  distanceToPoint: (pointA, pointB) ->
    return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y)

  ## Calculate the pathCost from this point to the tree head
  pathCost: (point, treeHead) ->
    cost = 0;
    treeB = treeHead.find( (node) -> node.data == point )
    while treeB
      cost += treeB.data.cost
      treeB = treeB.parent
    return cost
