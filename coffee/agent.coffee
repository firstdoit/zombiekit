Arboreal = require("../lib/arboreal")
Path = require("./path")

class Agent
  constructor: (@map) ->
    @position = {x: 1, y: 1}

  ## Find the nonCollidable points dirrectly adjacent from the given point
  nonCollidablePointsFromPoint: (point) ->
    up = @map.findPoint({x:point.x, y:point.y-1})
    right = @map.findPoint({x:point.x+1, y:point.y})
    down = @map.findPoint({x:point.x, y:point.y+1})
    left = @map.findPoint({x:point.x-1, y:point.y})
    nonCollidablePoints = []

    nonCollidablePoints.push ncpoint for ncpoint in [up, right, down, left] when ncpoint?.collidable is false
    return nonCollidablePoints

  ## A* implementation
  findBestPath: (originPoint, goalPoint, drawDebug) ->
    if originPoint.collidable is true or goalPoint.collidable is true
      return undefined
    ## Initialize our current point
    currentPoint = originPoint
    currentPoint.visited = true
    ## Create two tree node variables - head and current
    treeHead = treeCurrentNode = new Arboreal(null, currentPoint)
    ## The array for the best route
    bestRoute = []
    if drawDebug
      drawDebug(currentPoint)

    ## While we haven't found the goal point
    while not currentPoint.equals goalPoint
      ncpoints = @nonCollidablePointsFromPoint currentPoint
      ## For each navigable point, append it to the current tree node.
      for point in ncpoints
        treeCurrentNode.appendChild point

      ##Fill the unvisitedPoints array
      unvisitedPointsMap = {}
      visitedPointsMap = {}
      unvisitedPoints = []
      treeHead.traverseDown( (node) ->
        key = node.data.x + '.' + node.data.y
        if node.data.visited
          visitedPointsMap[key] = node.data
        else
          unvisitedPointsMap[key] = node.data
        return true
      )

      for key, upoint of unvisitedPointsMap
        if not visitedPointsMap[key]
          unvisitedPoints.push(upoint)

      if drawDebug
        drawDebug(currentPoint, unvisitedPoints)
        ##console.log 'current point:', currentPoint

      ## Initialize our best point in this round
      bestPoint = unvisitedPoints[0]
      bestPointHeuristicValue = @heuristicValue bestPoint, goalPoint, treeHead

      ##Choose the best point to visit next from the rest of the unvisited points
      for point in unvisitedPoints[1..]
        pointHeuristicValue = @heuristicValue point, goalPoint, treeHead
        if pointHeuristicValue < bestPointHeuristicValue
          bestPoint = point
          bestPointHeuristicValue = pointHeuristicValue

      ## Lest visit the best point next
      currentPoint = bestPoint
      currentPoint.visited = true;
      ## Update the current tree node
      treeCurrentNode = treeHead.find( (node) -> node.data == currentPoint )

      if drawDebug
        drawDebug(currentPoint)
        ''
        ##console.log 'current point:', currentPoint
    ## end while

    ## Construct the best route from the bottom of the tree to the head
    while treeCurrentNode
      bestRoute.push(treeCurrentNode?.data)
      treeCurrentNode = treeCurrentNode.parent

    ## Clear the debug draw
    if drawDebug
      drawDebug()

    bestRoute.reverse()
    return new Path(bestRoute)

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

  findBestTour: (points, drawDebug) ->
    console.log 'Finding best tour...'
    console.log points
    permutations = @permutationsTwoByTwo points
    paths = {}
    for array in permutations
      path = @findBestPath(array[0], array[1], drawDebug)
      paths[path.key()] = path
      reversePath = new Path(path.points).reverse()
      paths[reversePath.key()] = reversePath
    console.log paths
    ## Ache o tour direto
    tour = new Path([])
    for point, i in points
      tpath = new Path(points[i..i+1])
      key = tpath.key()
      tour.addPath paths[key] if i < points.length - 1
    console.log 'Best tour found.'
    return tour

  permutationsTwoByTwo: (arr) ->
    if arr.length is 0
      return []
    results = []
    for value in arr[1..]
      if (arr[0].equals value)
        continue
      res = [arr[0], value]
      results.push res

    return results.concat @permutationsTwoByTwo arr[1..]


## export
module.exports = Agent