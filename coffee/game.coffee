World = require("./world")
AgentEntity = require("./agent-entity")

class Game
  constructor: ->
    @world = new World($('#canvas')[0])
    @world.init().then(( (value) =>
      @agent = new AgentEntity(@world, @world.point({x: 1, y: 1}))
      @world.addEntity @agent
      ###@world.pointsOfInterest = [
        @world.point(3, 3),
        @world.point(7, 4),
        @world.point(18, 6),
        @world.point(8, 17),
        @world.point(19, 17),
        @world.point(3, 3)
      ]###

      @world.pointsOfInterest = [
        @world.point(3, 3),
        @world.point(8, 17)
      ]

      path = @agent.findBestTour @world.pointsOfInterest
      console.log path
      @agent.setPath path
      @agent.executePath()
    ),
      ( (error) =>
        console.log 'Error initializing world', error
      )
    )

## export
module.exports = Game