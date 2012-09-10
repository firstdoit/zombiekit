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
      @world.point(2,4),
      @world.point(4,5),
      @world.point(1,1)
    ]

    path = @agent.findBestTour @world.pointsOfInterest
    console.log path
    @agent.setPath path
    @agent.executePath()


## export
module.exports = Game