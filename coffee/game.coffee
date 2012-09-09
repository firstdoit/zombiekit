World = require("./world")
AgentEntity = require("./agent-entity")

class Game
  constructor: ->
    @world = new World($('#canvas')[0])
    @world.init()
    @agent = new AgentEntity(@world, @world.map.findPoint({x:1,y:1}))
    @world.addEntity(@agent)

    console.log @agent.findBestPath(@world.map.findPoint({x:1,y:1}), @world.map.findPoint({x:3,y:5})).toString()
    console.log @agent.findBestPath(@world.map.findPoint({x:1,y:1}), @world.map.findPoint({x:5,y:2})).toString()
    console.log @agent.findBestPath(@world.map.findPoint({x:1,y:1}), @world.map.findPoint({x:4,y:4})).toString()

    @agent.planPath(@world.map.findPoint({x:1,y:1}), @world.map.findPoint({x:3,y:5}))

## export
module.exports = Game