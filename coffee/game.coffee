World = require("./world")
AgentEntity = require("./agent-entity")

class Game
  constructor: ->
    @world = new World($('#canvas')[0])
    @world.init().then(( (value) =>
      ),
      ( (error) =>
        console.log 'Error initializing world', error
      )
    )

  run: (debug) ->
    @world.reset()
    @debugMode = debug
    @agent = new AgentEntity(@world, @world.point({x: 1, y: 1}))
    @world.addEntity @agent
    @world.pointsOfInterest = [
      @world.point(3, 3),
      @world.point(7, 4),
      @world.point(18, 6),
      @world.point(19, 17),
      @world.point(8, 17),
      @world.point(3, 3)
    ]

    if debug
      ##@agent.findBestPathDebug(@world.pointsOfInterest[0], @world.pointsOfInterest[1])
      @agent.findBestTour @world.pointsOfInterest
      console.log 'Finding path in debug mode'
    else
      ## While not in debug mode, "findBestTour" returns synchronously
      path = @agent.findBestTour @world.pointsOfInterest
      console.log 'Chosen path and cost: ', path, path.cost()
      @agent.setPath path
      @agent.executePath()

## export
module.exports = Game