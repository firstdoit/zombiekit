(function() {
  var Game;

  window.Game = Game = (function() {

    function Game() {
      this.map = MapFactory.getMap();
      this.agent = new Agent(this.map);
      console.log(this.agent.findBestRoute(this.map.findPoint({
        x: 1,
        y: 1
      }), this.map.findPoint({
        x: 3,
        y: 5
      })));
      console.log(this.agent.findBestRoute(this.map.findPoint({
        x: 1,
        y: 1
      }), this.map.findPoint({
        x: 5,
        y: 2
      })));
      console.log(this.agent.findBestRoute(this.map.findPoint({
        x: 1,
        y: 1
      }), this.map.findPoint({
        x: 4,
        y: 4
      })));
    }

    return Game;

  })();

}).call(this);
