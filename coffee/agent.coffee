Arboreal = require("../lib/arboreal")
Path = require("./path")

class Agent
  constructor: (@map) ->
    @position = {x: 1, y: 1}
    @currentPoint = {}
    @currentGoalPoint = {}
    @treeHead = {}
    @treeCurrentNode = {}
    @paths = {}
    @currentPathPoints = []
    @drawDebugFunction = undefined
    @nextStep = undefined

    ## A* implementation
  findBestPath: (originPoint, goalPoint) ->
    ## Check if it's a known path
    existingPathKey = new Path([originPoint, goalPoint]).key()
    return @paths[existingPathKey] if @paths[existingPathKey]

    ## Start the agent state
    @startPathFinding(originPoint, goalPoint)

    ## While we haven't found the goal point
    while @nextStep isnt @endPathFinding
      @findNonCollidablePoints()
      @findUnvisitedPoints()
      @findNextBestPoint()

    @endPathFinding()

  startPathFinding: (originPoint, goalPoint) ->
    if originPoint.collidable is true or goalPoint.collidable is true
      return undefined

    @findingPath = true
    @currentGoalPoint = goalPoint
    @currentPoint = originPoint
    @currentPoint.visited = true
    @treeHead = @treeCurrentNode = new Arboreal(null, @currentPoint)
    @currentPathPoints = []
    @nextStep = @findNonCollidablePoints

  findNonCollidablePoints: ->
    ncpoints = @nonCollidablePointsFromPoint @currentPoint
    @drawDebugFunction?({point:@currentPoint, nonCollidablePoints: ncpoints})

    ## For each navigable point, append it to the current tree node.
    for point in ncpoints
      @treeCurrentNode.appendChild point

    @nextStep = @findUnvisitedPoints

  findUnvisitedPoints: ->
    ## Fill the unvisitedPoints array
    unvisitedPointsMap = {}
    visitedPointsMap = {}
    @treeHead.traverseDown( (node) ->
      key = node.data.x + '.' + node.data.y
      if node.data.visited
        visitedPointsMap[key] = node.data
      else
        unvisitedPointsMap[key] = node.data
      return true
    )

    ## Let's search only for the points that have never been visited
    @unvisitedPoints = []
    for key, upoint of unvisitedPointsMap
      @unvisitedPoints.push(upoint) if not visitedPointsMap[key]

    ## For debugging purposes only
    if @drawDebugFunction
      visitedPoints = []
      for key, upoint of visitedPointsMap
        visitedPoints.push(upoint)
      @drawDebugFunction({visitedPoints:visitedPoints, unvisitedPoints: @unvisitedPoints})

    @nextStep = @findNextBestPoint

    ## Impossible to find a path
    return false if @unvisitedPoints.length is 0

    return true

  findNextBestPoint: ->
    ## Initialize our best point in this round
    bestPoint = @unvisitedPoints[0]
    bestPointHeuristicValue = @heuristicValue bestPoint, @currentGoalPoint, @treeHead

    ##Choose the best point to visit next from the rest of the unvisited points
    for point in @unvisitedPoints[1..]
      pointHeuristicValue = @heuristicValue point, @currentGoalPoint, @treeHead
      if pointHeuristicValue < bestPointHeuristicValue
        bestPoint = point
        bestPointHeuristicValue = pointHeuristicValue

    @drawDebugFunction?({point:bestPoint})

    ## Lest visit the best point next
    @currentPoint = bestPoint
    @currentPoint.visited = true;
    ## Update the current tree node
    @treeCurrentNode = @treeHead.find( (node) => node.data is @currentPoint )

    if @currentPoint.equals @currentGoalPoint
      @nextStep = @endPathFinding
    else
      @nextStep = @findNonCollidablePoints

  endPathFinding: ->
    ## Construct the best route from the bottom of the tree to the head
    while @treeCurrentNode
      @currentPathPoints.push(@treeCurrentNode?.data)
      @treeCurrentNode = @treeCurrentNode.parent

    ## Clear the debug draw
    @drawDebugFunction?()

    @currentPathPoints.reverse()
    path = new Path(@currentPathPoints)
    ## Store this path so we dont have to calculate it again next time it is asked.
    @paths[path.key()] = path
    @findingPath = false
    @treeHead = @treeCurrentNode = undefined

    @nextStep = undefined

    return path

  ## Find the nonCollidable points dirrectly adjacent from the given point
  nonCollidablePointsFromPoint: (point) ->
    up = @map.findPoint({x:point.x, y:point.y-1})
    right = @map.findPoint({x:point.x+1, y:point.y})
    down = @map.findPoint({x:point.x, y:point.y+1})
    left = @map.findPoint({x:point.x-1, y:point.y})
    nonCollidablePoints = []

    nonCollidablePoints.push ncpoint for ncpoint in [up, right, down, left] when ncpoint?.collidable is false
    return nonCollidablePoints

  ## Calculate the heuristic value of this point, given a goal point and a points tree
  heuristicValue: (point, goalPoint, treeHead) ->
    return ( @distanceToPoint(point, goalPoint) * 10 ) + @pathCost(point, treeHead)

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

  findBestTour: (points) ->
    console.log 'Finding best tour...'
    console.log points
    @tourPoints = points
    @permutations = @permutationsTwoByTwo points
    @paths = {}

    ## If not in debug mode, return the computation of the tour immediately
    if not game.debugMode
      for array in @permutations
        path = @findBestPath(array[0], array[1])
        @putPathInCache(path)

      ## Ache o tour direto
      tour = @findTourFromPoints(points)
      console.log 'Best tour found.'
      return tour

  findTourFromPoints: (points) ->
    tour = new Path([])
    for point, i in points
      tpath = new Path(points[i..i+1])
      key = tpath.key()
      tour.addPath @paths[key] if i < points.length - 1
    return tour

  putPathInCache: (path) ->
    @paths[path.key()] = path
    reversePath = new Path(path.points).reverse()
    @paths[reversePath.key()] = reversePath

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

  update: ->
    if @nextStep
      if @nextStep is @endPathFinding
        path = @endPathFinding()
        @putPathInCache(path)

        if not @tourPoints
          @endPathFindCallback?(path)

        ## We just found the last path
        if @permutations.length is 0
          tour = @findTourFromPoints(@tourPoints)
          @endPathFindCallback?(tour)

      else
        @nextStep()
    else if @permutations?.length isnt 0
      @startPathFinding(@permutations[0][0], @permutations[0][1])
      @permutations = @permutations[1..]


## export
module.exports = Agent