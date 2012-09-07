(function() {
  var Agent;

  window.Agent = Agent = (function() {

    function Agent(map) {
      this.map = map;
      this.position = {
        x: 1,
        y: 1
      };
    }

    Agent.prototype.nonCollidablePointsFromPoint = function(point) {
      var down, left, ncpoint, nonCollidablePoints, right, up, _i, _len, _ref;
      up = this.map.findPoint({
        x: point.x,
        y: point.y - 1
      });
      right = this.map.findPoint({
        x: point.x + 1,
        y: point.y
      });
      down = this.map.findPoint({
        x: point.x,
        y: point.y + 1
      });
      left = this.map.findPoint({
        x: point.x - 1,
        y: point.y
      });
      nonCollidablePoints = [];
      _ref = [up, right, down, left];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ncpoint = _ref[_i];
        if ((ncpoint != null ? ncpoint.type : void 0) === Map.road) {
          nonCollidablePoints.push(ncpoint);
        }
      }
      return nonCollidablePoints;
    };

    Agent.prototype.findBestRoute = function(originPoint, goalPoint) {
      var bestPoint, bestPointHeuristicValue, bestRoute, currentPoint, point, pointHeuristicValue, treeCurrentNode, treeHead, unvisitedPoints, _i, _j, _len, _len1, _ref, _ref1, _ref2;
      currentPoint = originPoint;
      currentPoint.visited = true;
      treeHead = treeCurrentNode = new Arboreal(null, currentPoint);
      bestRoute = [];
      while (!currentPoint.equals(goalPoint)) {
        _ref = this.nonCollidablePointsFromPoint(currentPoint);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          point = _ref[_i];
          if ((_ref1 = treeCurrentNode.parent) != null ? _ref1.data.equals(point) : void 0) {
            point.visited = true;
          }
          treeCurrentNode.appendChild(point);
        }
        unvisitedPoints = [];
        treeHead.traverseDown(function(node) {
          if (!node.data.visited) {
            return unvisitedPoints.push(node.data);
          }
        });
        bestPoint = unvisitedPoints[0];
        bestPointHeuristicValue = this.heuristicValue(bestPoint, goalPoint, treeHead);
        _ref2 = unvisitedPoints.slice(1);
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          point = _ref2[_j];
          pointHeuristicValue = this.heuristicValue(point, goalPoint, treeHead);
          if (pointHeuristicValue < bestPointHeuristicValue) {
            bestPoint = point;
            bestPointHeuristicValue = pointHeuristicValue;
          }
        }
        currentPoint = bestPoint;
        currentPoint.visited = true;
        treeCurrentNode = treeHead.find(function(node) {
          return node.data === currentPoint;
        });
      }
      while (treeCurrentNode) {
        bestRoute.push(treeCurrentNode != null ? treeCurrentNode.data.toString() : void 0);
        treeCurrentNode = treeCurrentNode.parent;
      }
      return bestRoute.reverse();
    };

    Agent.prototype.heuristicValue = function(point, goalPoint, treeHead) {
      return this.distanceToPoint(point, goalPoint) + this.pathCost(point, treeHead);
    };

    Agent.prototype.distanceToPoint = function(pointA, pointB) {
      return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y);
    };

    Agent.prototype.pathCost = function(point, treeHead) {
      var cost, treeB;
      cost = 0;
      treeB = treeHead.find(function(node) {
        return node.data === point;
      });
      while (treeB) {
        cost += treeB.data.cost;
        treeB = treeB.parent;
      }
      return cost;
    };

    return Agent;

  })();

}).call(this);
