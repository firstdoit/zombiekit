Entity = require("./entity")
Agent = require("./agent")

class AgentEntity extends Entity
  constructor: ->
    super
    @agent = new Agent(@world.map)
    @shape = @createShape()

  findBestPath: (args...) -> @agent.findBestPath(args[0], args[1])

  createShape: ->
    g = new createjs.Graphics()
    g.setStrokeStyle(5)
    g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
    g.drawCircle(0,0, 30)
    circle = new createjs.Shape(g)
    circle.x = 0
    circle.y = 0
    return circle

## export
module.exports = AgentEntity