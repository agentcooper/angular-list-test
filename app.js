angular.module('LJ', ['infinite-scroll'], function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(false);

  $routeProvider
    .when('/category/:categoryName', {})
    .when('/', {});
});

angular.module('LJ')
.factory('Rating', function($http, $timeout) {
  var Rating = {};

  // these should persist between category changes
  Rating.readEntries   = {};
  Rating.hiddenEntries = {};

  /*
   * Ids of a current user friends, used for friend filtering
   */
  Rating.friends = ['ivan'];
  Rating.entries = [];

  var debugEntries1 = [],
      debugEntries2 = [];

  for (var i = 1; i < 500; i++) {
    debugEntries1.push({
      title: '1title' + i,
      content: 'content' + i,
      post_id: i,
      user: 'user' + i,
      journal_id: i
    });

    debugEntries2.push({
      title: '2title' + i,
      content: 'content' + i,
      post_id: i,
      user: 'user' + i,
      journal_id: i
    });
  }

  /*
   * Get rating from server
   * @param {string} category Category type
   */
  Rating.get = function(category, callback) {

    setTimeout(function() {

      switch (category) {
        case 'art':
          Rating.entries = debugEntries1;
        break;

        case 'sport':
          Rating.entries = debugEntries1;
        break;

        default:
          Rating.entries = debugEntries1;
        break;
      }

      $timeout(callback);

    }, 1500);
  };

  /*
   * Getter/setter to indicate if entry was read
   */
  Rating.read = function(entry, value) {
    if (typeof value !== 'undefined') {
      Rating.readEntries[Rating.hash(entry)] = value;
    } else {
      return Boolean(Rating.readEntries[Rating.hash(entry)]);
    }
  };

  /*
   * Getter/setter to indicate if entry was hidden from rating
   */
  Rating.hidden = function(entry, value) {
    if (typeof value !== 'undefined') {
      Rating.hiddenEntries[Rating.hash(entry)] = value;
    } else {
      return Boolean(Rating.hiddenEntries[Rating.hash(entry)]);
    }
  };

  Rating.getUser = function(entry) {
    return entry.user;
  }

  Rating.hash = function(entry) {
    return Rating.getUser(entry) + '-' + entry.post_id;
  };

  Rating.uniqueEntries = function() {
    var unique = {};

    Rating.entries.forEach(function(entry) {
      if (!unique[Rating.getUser(entry)]) {
        unique[Rating.getUser(entry)] = Rating.hash(entry);
      }
    });

    return unique;
  }

  /*
   * @return {Boolean}
   */
  Rating.fromAFriend = function(entry) {
    return Rating.friends.indexOf(entry.user) !== -1;
  }

  Rating.sameAuthor = function(authorEntry) {
    return Rating.entries.filter(function(entry) {
      return Rating.getUser(entry) === Rating.getUser(authorEntry);
    });
  }

  Rating.isFirst = function(entry, unique) {
    return unique[Rating.getUser(entry)] === Rating.hash(entry);
  }

  return Rating;
});

angular.module('LJ')
.controller('RatingCtrl', function($scope, Rating, $route, $routeParams, $location, $timeout) {
  var pageSize = 10;

  $scope.showHidden     = false;
  $scope.showRead       = false;
  $scope.showFriends    = false;
  $scope.showDuplicates = true;

  $scope.read   = Rating.read;
  $scope.hidden = Rating.hidden;

  $scope.friends = Rating.friends;

  $scope.scrollMode = false;

  $scope.filtered = function(amount) {
    var unique = Rating.uniqueEntries();

    return Rating.entries.filter(function(entry) {
      return ($scope.showDuplicates ? true : Rating.isFirst(entry, unique)) &&
             ($scope.showHidden     ? true : !Rating.hidden(entry)) &&
             ($scope.showRead       ? true : !Rating.read(entry))   &&
             ($scope.showFriends    ? true : !Rating.fromAFriend(entry));
    }).slice(0, amount || $scope.showAmount);
  };

  $scope.toggleHidden = function(toggledEntry, event) {
    Rating.sameAuthor(toggledEntry).forEach(function(entry) {
      Rating.hidden(entry, !Rating.hidden(entry));
    });
  };

  $scope.toggleRead = function(entry, event) {
    Rating.read(entry, !Rating.read(entry));
  };

  $scope.showMore = function() {
    $scope.scrollMode = true;
    $scope.showAmount += pageSize;
  };

  $scope.anyLeft = function() {
    return $scope.filtered().length < $scope.filtered($scope.showAmount + pageSize).length;
  };

  $scope.$on('$routeChangeSuccess', function(next, current) {
    // do not animate on initial render and category switching
    animate(false);
    $scope.loading = true;

    $scope.category = current.params.categoryName;
    if (!$scope.category) {
      $scope.category = "";
    }

    Rating.get(current.params.categoryName, function() {
      $scope.showAmount = pageSize;

      $scope.loading = false;

      $timeout(function() {
        animate(true);
      });
    });
  });

  /*
   * Toggle animation state
   */
  function animate(state) {
    $scope.listAnimation = state ? {
      enter: 'slide-down',
      leave: 'slide-up'
    } : null;
  }
});

angular.module('LJ')
.directive('route', function() {
  return function(scope, element, attrs) {
    scope.$watch('category', function() {
      element.toggleClass(
        'b-rating__category-active',
        scope.category === attrs.route);
    });
  }
})
.animation('slide-up', function () {
  return {
    start: function(element, done, memo) {
      var $element = $(element);
      $element.fadeTo('fast', 0.0, function() {
        $element.slideUp('fast', done);
      });
    }
  };
})
.animation('slide-down', function () {
  return {
    setup: function(element) {
      $(element).css({ display: 'none' });
    },
    start: function(element, done, memo) {
      $(element).slideDown('fast', done);
    }
  };
})
.directive('inverted', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(val) { return !val; });
      ngModel.$formatters.push(function(val) { return !val; });
    }
  };
});
