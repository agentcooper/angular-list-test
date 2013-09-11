angular.module('LJ', ['infinite-scroll'], function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(false);

  $routeProvider
    .when('/', {
      templateUrl: 'rating.html',
      controller: 'RatingCtrl'
    })
    .when('/category/:categoryName', {
      templateUrl: 'rating.html',
      controller: 'RatingCtrl'
    })
    .when('/editors', {
      templateUrl: 'editors.html',
      controller: 'EditorsCtrl'
    })
    .when('/latest', {
      templateUrl: 'latest.html',
      controller: 'LatestCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

});

angular.module('LJ')
.factory('MainPage', function($http, $timeout) {
  var MainPage = {};

  MainPage.settings = {
    locale: 'cyr',
    category: null
  };

  //debug for timeposts
  var Site = Site || {server_time: Math.floor(Date.now()/1000)};

  // timepost for latest category
  MainPage.settingsLatest = {
    'first_timepost': Math.floor(Site.server_time/120) * 120,
    'last_timepost': 0
  };

  // current amount of pages
  MainPage.page = 0;

  // these should persist between category changes
  MainPage.readEntries   = {};
  MainPage.hiddenEntries = {};

  /*
   * Ids of a current user friends, used for friend filtering
   */
  MainPage.friends = ['ivan'];
  MainPage.entries = [];

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

  MainPage.categories = [
    { name: 'home'      , id:  0, route: '' },
    { name: 'editors'   ,         route: 'editors' },
    { name: 'news'      , id: 14, route: 'category/news' },
    { name: 'cute'      , id:  4, route: 'category/cute' },
    { name: 'knowing'   , id:  2, route: 'category/knowing' },
    { name: 'society'   , id:  8, route: 'category/society' },
    { name: 'discussion', id: 10, route: 'category/discussion' },
    { name: 'media'     , id:  6, route: 'category/media' },
    { name: 'world'     , id: 16, route: 'category/world' },
    { name: 'adult'     , id: 12, route: 'category/adult' },
    { name: 'latest'    ,         route: 'latest' }
  ];

  function getCategoryId(name) {
    var categoryId = 0;

    MainPage.categories.some(function(category) {
      if (category.name === name) {
        categoryId = category.id;
        return true;
      }
    });

    return categoryId;
  }

  /*
   * Get rating from server
   * @param {string} category Category type
   * @param {boolean} reset Optional, set to true if a category was switched
   */
  MainPage.get = function(category, callback, reset) {

    MainPage.page = (reset) ? 0 : MainPage.page + 1;
    console.log('requesting page = ', MainPage.page);

    var str = 'http://l-api.livejournal.com/__api/?request=';

    var methods = {
      'editors': 'homepage.editors_page',
      'latest' : 'latest.get_entries',
      'rating' : 'homepage.get_rating'
    };

    var params = {
      'editors': {
      },
      'latest' : {
        'first_timepost' : MainPage.settingsLatest.first_timepost
      },
      'rating' : {
        'homepage'    : 1,
        'sort'        : 'visitors',
        'page'        : MainPage.page,
        'country'     : MainPage.settings.locale,
        'locale'      : 'ru_RU',
        'category_id' : getCategoryId(category)
      }
    };

    var obj = {
      'jsonrpc': '2.0',
      'method' : methods[category] || methods['rating'],
      'params' : params[category]  || params['rating'],
      'id': Date.now()
    };

    $http.jsonp(str + encodeURIComponent(JSON.stringify(obj)), {
      params: {
        callback: 'JSON_CALLBACK'
      }
    }).success(function(data) {
      if (!data.result) {
        console.error(data);
      }

      // console.log(data.result.rating);

      if (category === 'editors') {
        MainPage.editorsHTML = data.result.body;


      } else if (category === 'latest') {
        MainPage.settingsLatest.first_timepost = data.result.params.first_timepost;
        if (reset) {
          MainPage.settingsLatest.last_timepost = data.result.params.last_timepost;
          MainPage.entries = data.result.params.homepage_latest;
        } else {
          //console.log(data.result.params);
          Array.prototype.push.apply(MainPage.entries, data.result.params.homepage_latest);
        }

      } else {
        // ratings
        if (reset) {
          MainPage.entries = data.result.rating;
        } else {
          //debug if, should be removed after backend fix
          if (data.result.rating[0].toString() !== MainPage.entries[0].toString())
            Array.prototype.push.apply(MainPage.entries, data.result.rating);
        }
      }

      callback();
    });

  };

  /*
   * Getter/setter to indicate if entry was read
   */
  MainPage.read = function(entry, value) {
    if (typeof value !== 'undefined') {
      MainPage.readEntries[MainPage.hash(entry)] = value;
    } else {
      return Boolean(MainPage.readEntries[MainPage.hash(entry)]);
    }
  };

  /*
   * Getter/setter to indicate if entry was hidden from rating
   */
  MainPage.hidden = function(entry, value) {
    if (typeof value !== 'undefined') {
      MainPage.hiddenEntries[MainPage.hash(entry)] = value;
    } else {
      return Boolean(MainPage.hiddenEntries[MainPage.hash(entry)]);
    }
  };

  MainPage.getUser = function(entry) {
    return entry.ljuser[0].username;
  }

  MainPage.hash = function(entry) {
    return MainPage.getUser(entry) + '-' + entry.post_id;
  };

  MainPage.uniqueEntries = function() {
    var unique = {};

    MainPage.entries.forEach(function(entry) {
      if (!unique[MainPage.getUser(entry)]) {
        unique[MainPage.getUser(entry)] = MainPage.hash(entry);
      }
    });

    return unique;
  }

  /*
   * @return {Boolean}
   */
  MainPage.fromAFriend = function(entry) {
    return MainPage.friends.indexOf(entry.user) !== -1;
  }

  MainPage.sameAuthor = function(authorEntry) {
    return MainPage.entries.filter(function(entry) {
      return MainPage.getUser(entry) === MainPage.getUser(authorEntry);
    });
  }

  MainPage.isFirst = function(entry, unique) {
    return unique[MainPage.getUser(entry)] === MainPage.hash(entry);
  }

  return MainPage;
});


/////////////
angular.module('LJ')
.controller('MainCtrl', function($scope, MainPage, $timeout) {
  console.log('MainCtrl');

  var pageSize = 10;

  $scope.showHidden     = false;
  $scope.showRead       = false;
  $scope.showFriends    = false;
  $scope.showDuplicates = true;

  $scope.read   = MainPage.read;
  $scope.hidden = MainPage.hidden;
  $scope.friends = MainPage.friends;
  $scope.settings = MainPage.settings;

  $scope.scrollMode = false;


  $scope.filtered = function() {
    var unique = MainPage.uniqueEntries();

    var filtered = MainPage.entries.filter(function(entry) {
      return ($scope.showDuplicates ? true : MainPage.isFirst(entry, unique)) &&
             ($scope.showHidden     ? true : !MainPage.hidden(entry)) &&
             ($scope.showRead       ? true : !MainPage.read(entry))   &&
             ($scope.showFriends    ? true : !MainPage.fromAFriend(entry));
    });

    /* side effect */
    $scope.anyLeft =
      filtered.slice(0, $scope.showAmount).length < filtered.slice(0, $scope.showAmount + pageSize).length;

    return filtered.slice(0, $scope.showAmount);
  };

  $scope.toggleHidden = function(toggledEntry, event) {
    MainPage.sameAuthor(toggledEntry).forEach(function(entry) {
      MainPage.hidden(entry, !MainPage.hidden(entry));
    });
  };

  $scope.toggleRead = function(entry, event) {
    MainPage.read(entry, !MainPage.read(entry));
  };

  $scope.showMore = function() {
    // return if something is loading
    if ($scope.loading || $scope.loadingMore) {
      return;
    }

    // show more entries from MainPage.entries
    if ($scope.anyLeft) {
      delayAndShow();
      return;
    }

    // load more entries from server
    $scope.loadingMore = true;
    MainPage.get(MainPage.settings.category, function() {
      $scope.filtered();
      if ($scope.anyLeft) {
        // show more entries
        delayAndShow();
      } else {
        // no more entries on server, stop asking for it
        $scope.scrollMode = false;
        console.log('no more');
      }
    });

  };

  function delayAndShow() {
    animate(false);
    $scope.loadingMore = true;
    $timeout(function() {
      $scope.loadingMore = false;
      animate(true);
    }, 500);

    $scope.showAmount += pageSize;
    $scope.scrollMode = true;
  }

  $scope.$watchCollection('[settings.category, settings.locale]', function(values) {
    var category = values[0],
        locale   = values[1];

    if (!category || !locale) {
      return;
    }

    animate(false);
    $scope.loading = true;
    $scope.scrollMode = false;

    MainPage.get(category, function() {
      $scope.showAmount = pageSize;
      $scope.loading = false;
      $timeout(function() {
        animate(true);
      });
    }, true);
  });

  $scope.getUser = MainPage.getUser;

  $scope.categories = MainPage.categories;

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

//////////

angular.module('LJ')
.controller('RatingCtrl', function($scope, MainPage, $routeParams) {
  console.log('RatingCtrl');
  //console.log('RatingCtrl', $routeParams);
  MainPage.settings.category = $routeParams.categoryName || 'home';

});
//////////

angular.module('LJ')
.controller('LatestCtrl', function($scope, MainPage) {
  MainPage.settings.category = 'latest';
  console.log('LatestCtrl');

  //@TODO update button by timeout
  // $scope.time = 1000;//120000;

  // var timeout;
  // var ping = function(){
  //   console.log(Date.now());
  //   timeout = setTimeout(ping, $scope.time);
  // };

  // timeout = setTimeout(ping, $scope.time);
  // $scope.$on('$destroy', function() {
  //   clearTimeout(timeout);
  // });


});
//////////

angular.module('LJ')
.controller('EditorsCtrl', function($scope, MainPage) {
  MainPage.settings.category = 'editors';
   $scope.editorsHTML = MainPage.editorsHTML = '';
   $scope.$watch( function() {
     return MainPage.editorsHTML;
   }, function() {
     $scope.editorsHTML = MainPage.editorsHTML;
   });
  console.log('EditorsCtrl');
});
/////////

angular.module('LJ')
.directive('route', function() {
  return function(scope, element, attrs) {
    var route = attrs.route;

    scope.$watch('settings.category', function(category) {
      // console.log(category, attrs.route);
      element.toggleClass(
        'b-rating__category-active',
        category === route);
    });
  };
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
