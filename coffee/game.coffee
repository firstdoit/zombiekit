window.Game = class Game
  constructor: ->
    @map = MapFactory.getMap()
    @agent = new Agent(@map)

    ##alert "[x=" + point.x + ", y=" + point.y + "]" for point in @agent.searchNextPoints()
    console.log @agent.findBestRoute(@map.findPoint({x:1,y:1}), @map.findPoint({x:3,y:5}))
    console.log @agent.findBestRoute(@map.findPoint({x:1,y:1}), @map.findPoint({x:5,y:2}))
    console.log @agent.findBestRoute(@map.findPoint({x:1,y:1}), @map.findPoint({x:4,y:4}))