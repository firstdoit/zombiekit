World = require("./world")
AgentEntity = require("./agent-entity")

class Game
  constructor: ->
    @world = new World($('#canvas')[0])
    @world.init()
    @agent = new AgentEntity(@world, @world.point({x:1,y:1}))
    @world.addEntity @agent
    @world.pointsOfInterest = [
      @world.point(1,1),
      @world.point(5,3),
      @world.point(2,5),
      @world.point(3,4),
      @world.point(1,1)
    ]

    @agent.planPath @world.point(1,1), @world.point(5,5)

    @agent.findBestTour @world.pointsOfInterest

## export
module.exports = Game