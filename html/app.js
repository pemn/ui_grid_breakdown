//javascript
/*
  Copyright 2017 Vale
 
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
 
  http://www.apache.org/licenses/LICENSE-2.0
  
  v1.1 05/2017 paulo.ernesto
  v1.0 02/2016 paulo.ernesto
*/

var app = angular.module('app', ['ngAnimate', 'ngTouch', 'ui.grid', 'ui.grid.selection', 'ui.grid.exporter']);

app.service('pivot', function (){
  var _pivot = {};
  // flag to indicate that the number of pivots changed
  var _base = 0;
  // flag to indicate that a condition inside one of the pivots changed
  var _item = 0;
  var _breakdown = undefined;

  this.pivots = function(){
    return(Object.keys(_pivot));
  };
  this.getPivot = function(name){
    if(_pivot.hasOwnProperty(name)){
      return(_pivot[name]);
    }
    return([]);
  };
  // convenience debug function
  this.getPivots = function(name){
    return(_pivot);
  };
  this.use = function(row, index){
    var r = true;
    Object.keys(_pivot).forEach( function(field){
      for(var i = _pivot[field].length - 1; i >= 0;i--){
        if(_pivot[field][i] == row[field]) break;
        if(i == 0) r = false;
      }
    });
    return(r);
  };
  this.tables = function(){
    var _items = new Array();
    for(var i=0; i < _table.length;i++){
      _items.push(Object.keys(_table[i])[0]);
    }
    return(_items);
  };
  this.parse_breakdown_mask = function(breakdown_mask){
      _breakdown = new Array();
      var _item_flag = 0;
      var _base_flag = 0;
      for(var j=0; j < breakdown_mask.length; j++){
        var item = breakdown_mask[j].split(',');
        if(item.length == 0) {
          // empty line, do nothing
        } else if(item.length == 1 || item[1] === 'breakdown') {
          if(_pivot.hasOwnProperty(item[0])) {
            _pivot[item[0]] = item.slice(2);
            _item_flag = 1;
          } else {
            this.add(item[0], item.slice(2));
            _base_flag = 1;
          }
        } else {
          _breakdown.push(item);
        }
      }
      _base += _base_flag;
      _item += _item_flag;
      // special case: this is the first time the mask is parsed we must set the item flag
      if(_item == 0) {
        _item++;
      }
      var pivotItems = this.pivots();
      // clip the breakdown to the current pivots
      for(var j=pivotItems.length - 1; j >= 0; j--){
        _breakdown.unshift([pivotItems[j]]);
      }
      return(_breakdown);
  };
  this.getBreakdown = function() {
    return(_breakdown);
  };
  // replace all "breakdown" (classification) columns in the template with a single user column
  this.getCustomBreakdown = function(field) {
    var r = angular.copy(_breakdown);
    while(r.length > 0 && r[0].length == 1) {
      r.shift();
    }
    // insert the user selected breakdown
    r.unshift([field]);
    return(r);
  };
  // return the columns in the breakdown template that are of type "breakdown" (classification)
  this.getBaseBreakdown = function(field) {
    var r = new Array();
    for(var i = 0;i < _breakdown.length;i++) {
      if (_breakdown[i].length == 1 || (_breakdown[i].length >= 2 && _breakdown[i][1] == "breakdown")) {
        r.push(_breakdown[i][0]);
      }
    }
    return(r);
  };
  this.base = function(){
    return(_base);
  };
  this.item = function(){
    return(_item);
  };
  // warn listeners to refresh
  this.warn = function(){
    _item++;
    return(_item);
  };
  this.del = function(col, val){
    if(! _pivot.hasOwnProperty(col))  {}
    else if(typeof _pivot[col] === 'undefined' || typeof val === 'undefined'){
      // delete entire column
      delete _pivot[col];
      _base++;
      _item++;
    } else if(_pivot[col].indexOf(val) != -1){
      // delete only a selected value on this column
      _pivot[col].splice(_pivot[col].indexOf(val), 1);
      _item++;
    }
  };
  this.add = function(col, val){
    if(typeof _pivot[col] === 'undefined'){
      _pivot[col] = new Array();
      _base++;
    } 
    if(angular.isArray(val)) {
      var _item_flag = 0;
      for(var i=0;i < val.length; i++) {
        if(_pivot[col].indexOf(val) == -1) {
          _pivot[col].push(val[i]);
          _item_flag = 1;
        }
      }
      _item += _item_flag;
    } else if(typeof val !== 'undefined' && _pivot[col].indexOf(val) == -1){
      // add a selected value to this column
      _pivot[col].push(val);
      _item++;
    }
  };
  this.clear = function() {
    _pivot = {};
    _base++;
  };
});

// create a database service instance which will be our central data storage and model
app.factory('database', function (){
  var _tableData = new Array();
  var _jinqData = new jinqJs();
  var _header;
  var _ready = 0;

  var _this = angular.extend(_jinqData, {
    clone: function(){
      var j = new jinqJs();
      j.from(_jinqData.select());
      return(j);
    },
    columns: function(){
      var newObjects = new Array();
      for(var i=0;i < _tableData.length;i++){
        if(_tableData[i] === null){
          // nothing to do, really
        } else {
          _tableData[i].forEach( function( field, index ){
            newObjects.push( { columns: field } );
          });
          break;
        }
      }
      return(newObjects);
    },
    createCsvObjects: function ( importArray ){
      var newObjects = new Array();
      _header = undefined;
      importArray.forEach( function( row, index ){
        if(row === null){
          // nothing to do, really
        } else if(! _header || _header.length == 0){
          _header = row;
        } else {
          var newObject = {};
          row.forEach( function( field, index ){
            if ( index < _header.length ){
              newObject[ _header[index] ] = field;
            }
          });
          newObjects.push( newObject );
        }
      });
      return(newObjects);
    },
    ready: function(){
      return(_ready);
    },
    refresh: function() {
      // notify watches to redraw, but only if database was already initialized
      if(_ready > 0) {
        _ready++;
      }
    },
    set: function (data){
      if(!data) return;
      _tableData = CSV.parse(data);
      if(_tableData.length > 0){
        // clear the table of any previous data
        // its quirky, but .delete().at() leaves leftover data in the private "collections"
        _this.join([]);
        // use the table as the new source for the database
        _this.from(_this.createCsvObjects(_tableData));
        _ready++;
      }
    },
    setUri: function(response) {
      if(response.data){
        _this.set(response.data);
      }
    }
  });

  return _this;
});

// controller
app.controller('MainCtrl', function ($scope, $http, $timeout, uiGridConstants, database, pivot){

  // ACTION HANDLERS {
  
  // this function must reside on this scope due to the $http service only being available here
  var watchUrl = function(newValue, oldValue) {
    pivot.clear();
    if(newValue) $http.get($scope.input_uri).then(database.setUri);
    // queue a pivot refresh since the tables only listen to pivot.item
    $timeout( pivot.warn , 1000);

  };

  var grid_a_Factory = function(grid_i, grid_name) {
    var _this = {
      name: grid_name,
      showColumnFooter: true,
      enableGridMenu: true,
      exporterCsvFilename: "export_grid_a_" + grid_name + ".csv",
      onRegisterApi: function(gridApi){
        _this.gridApi = gridApi;
        gridApi.core.registerColumnsProcessor(customColumnsProcessor, 40);
        $scope.$watch('grid_a[' + grid_i + '].name', _this.customQuery);
        $scope.$watch(pivot.item, _this.customQuery);
      },
      customQuery: function(newValue, oldValue){
        if(! newValue) return;
        if(! database.ready()) return;
        _this.gridApi.grid.options.columnDefs.length = 0;
        var jinqData = database.clone();
        jinqData.where(pivot.use);
        var breakdown_config = pivot.getCustomBreakdown($scope.grid_a[grid_i].name);
        jinqData = jinqData.breakdown.apply(jinqData, breakdown_config);
        if(! $scope.format_mt) {
          breakdown_config.pop();
        }
        jinqData = jinqData.round.apply(jinqData, breakdown_config);

        $timeout( function(){
          _this.data = jinqData.select();
        }, 0);
      }
    };
    return _this;
  }

  $scope.actionLoadURI = function(){
    console.log("actionLoadURI");
    // to "load" a resource, we in fact just fire the startup event chain again, and the new file will be read where appropriate
    watchUrl(true);
    //database.refresh();
  };
  $scope.actionLoadFile = function(){
    console.log("actionLoadFile");
    var input_file_node = document.getElementById("input_file");
    for(var i=0;i < input_file_node.files.length;i++) {
      var r = new FileReader();
      r.onloadend = function(e){
        console.log("e.target.result");
        database.set(e.target.result);
      }
      r.readAsBinaryString(input_file_node.files[i]);
    }
  };
  $scope.actionExportCSVs = function(){
    //grid.api.exporter.csvExport( uiGridExporterConstants.ALL, uiGridExporterConstants.ALL );
    for(var i=0;i < $scope.grid_a.length;i++) {
      $scope.grid_a[i].gridApi.exporter.csvExport( 'all', 'all' );
    }
    for(var i=0;i < $scope.grid_b.length;i++) {
      $scope.grid_b[i].gridApi.exporter.csvExport( 'all', 'all' );
    }
    alert("Finished! Be sure to ALLOW multiple file download if prompted.");
  };
  $scope.actionFormatMt = function(){
    console.log("actionFormatMt");
    $scope.format_mt = 1 - $scope.format_mt;
    database.refresh();
  };
  $scope.changeMode = function(){
    $scope.input_uri = $scope.db + ".csv";
    $http.get($scope.db + ".txt").then(getBreakdownTxt);
    if($scope.db == "default") {
      $scope.db = "reservas";
    } else {
      $scope.db = "default";
    }
  };
  $scope.customAction = function(){
    console.log("customAction");
    console.log($scope.grid_a);
    console.log($scope.grid_b);
  };
  // } ACTION HANDLERS

  // GRID SHARED UTIL {
  // create appropriate footer values for the procedurally generated columns
  // for the mass column, a simple sum
  // for all average columns, a weighted average by mass
  var customColumnsProcessor = function(columns, rows){
    columns.forEach(function(col) {
      if(col.colDef.type == "number") {
        col.aggregationHideLabel = true;
        if (col.colDef.name.indexOf('sum') != -1) {
          col.aggregationType = uiGridConstants.aggregationTypes.sum;
        } else if (col.colDef.name.indexOf('average') != -1) {
          // by convention, the last column is the mass
          var weight_name = columns[columns.length - 1].name
          col.aggregationType = function(visibleRows) {
            var v_sum = 0;
            var w_sum = 0;
            visibleRows.forEach(function (value) {
              v_sum += value.entity[col.name] * value.entity[weight_name];
              w_sum += value.entity[weight_name];
            });
            // no need to check division by 0, modern js engines will return Infinity
            return(Math.round((v_sum / w_sum) * 100) / 100);
          };
        }
      }
    });
    return rows;
  };
  var selectByValues = function(values, column){
    if(typeof column === 'undefined'){
      if(this.gridApi.grid.columns.length > 0){
        column = this.gridApi.grid.columns[0].name;
      } else {
        return;
      }
    }
    this.gridApi.grid.rows.forEach(function (row, index){
      for(var j=0; j < values.length; j++){
        if(row.entity[column] == values[j]){
          row.setSelected(1);
          break;
        }
      }
    });
  };
  var getBreakdownTxt = function(response) {
    if(response.status == 200) {
      $scope.breakdown_mask = response.data.split(/\r?\n/);
    } else if(response.config.url != 'default.txt') {
      // fall back to default
      $http.get('default.txt').then(getBreakdownTxt);
    }
  };
  // } GRID SHARED UTIL

  // KEY {
  $scope.gridKey = {
    enableRowHeaderSelection: false,
    onRegisterApi: function(gridApi){
      this.gridApi = gridApi;
      gridApi.selection.on.rowSelectionChanged($scope, this.rowSelectionChanged);
      $scope.$watch(pivot.base, this.customQuery);
    },
    rowSelectionChanged: function(row){
      Object.keys(row.entity).forEach( function( value, index ){
        if(value == '$$hashKey') return;
        if(row.isSelected){
          pivot.add(row.entity[value]);
        } else {
          pivot.del(row.entity[value]);
        }
      });
    },
    customQuery: function(newValue, oldValue){
      if(! newValue) return;
      $scope.gridKey.data = database.columns();
      $timeout( function(){
          selectByValues.apply($scope.gridKey,[pivot.pivots()]);
      }, 0);
    }
  };
  // } KEY

  // PIVOT {
  var pivotGridTemplate = {
    enableRowHeaderSelection: false,
    onRegisterApi: function(gridApi){
      this.gridApi = gridApi;
      gridApi.selection.on.rowSelectionChanged($scope, this.rowSelectionChanged);
    },
    rowSelectionChanged: function(row){
      if(row.grid.columns.length > 0){
        var column = row.grid.columns[0].name;
        if(row.isSelected){
          pivot.add(column, row.entity[column]);
        } else {
          pivot.del(column, row.entity[column]);
        }
      }
    }
  };
  $scope.pivotGrid = new Array();
  var pivotGridPopulate = function(newValue, oldValue) {
    if(! newValue) return;
    var pivotItems = pivot.pivots();
    // remove grids beloing to deleted pivots
    for(var i=$scope.pivotGrid.length-1; i>=0; i--){
      if(pivotItems.indexOf($scope.pivotGrid[i].name) == -1) {
        $scope.pivotGrid.splice(i, 1);
      }
    }
    // create or update existing grids
    for(var p=0; p < pivotItems.length; p++) {
      var g = 0;
      for(;g < $scope.pivotGrid.length; g++) {
        if($scope.pivotGrid[g].name == pivotItems[p]) {
          break;
        }
      }
      // grid for this pivot does not exist yet, lets create it
      if(g == $scope.pivotGrid.length) {
        $scope.pivotGrid[g] = angular.copy(pivotGridTemplate);
        $scope.pivotGrid[g].name = pivotItems[p];
      }
      // now we ensure the grid exists, update the data
      $scope.pivotGrid[g].data = database.clone().distinct(pivotItems[p]).select();
    }
    // prepare in advance the gridOptions for each table
    if($scope.pivotGrid.length > pivotItems.length) {
      $scope.pivotGrid.length = pivotItems.length;
    }
    $timeout( function(){
      for(var i=0; i < pivotItems.length; i++) {
        selectByValues.apply($scope.pivotGrid[i],[pivot.getPivot($scope.pivotGrid[i].name)]);
      }
    }, 0);
  };
  $scope.$watch(pivot.base, pivotGridPopulate);
  // } PIVOT
  
  // GRID B {
  // for a given column, create a grid for each unique value
  var grid_b_template = {
    showColumnFooter: true,
    enableGridMenu: true,
    exporterMenuPdf: false,
    onRegisterApi: function(gridApi){
      this.gridApi = gridApi;
      gridApi.core.registerColumnsProcessor(customColumnsProcessor, 40);
    }
  };
  $scope.grid_b = new Array();
  $scope.grid_b_name = undefined;
  var populate_grid_b = function(newValue, oldValue){
    if(! newValue) return;
    if(! $scope.grid_b_name) return;
    var name = $scope.grid_b_name;
    var items = database.clone().distinct(name).select();
    if($scope.grid_b.length > items.length){
      $scope.grid_b.length = items.length;
    }
    for(var i=0; i < items.length; i++){
      if(items[i][name] == "") continue;
      if(typeof $scope.grid_b[i] === "undefined"){
        $scope.grid_b[i] = angular.copy(grid_b_template);
      }

      var jinqData = database.clone();
      jinqData.where(pivot.use);
      jinqData.where($scope.grid_b_name + ' = ' + items[i][name]);
      var breakdown_config = pivot.getBreakdown();
      jinqData = jinqData.breakdown.apply(jinqData, breakdown_config);
      if(! $scope.format_mt) {
        breakdown_config = angular.copy(breakdown_config);
        breakdown_config.pop();
      }
      jinqData = jinqData.round.apply(jinqData, breakdown_config);
      $scope.grid_b[i].name = items[i][name];
      $scope.grid_b[i].exporterCsvFilename = 'export_' + name + '_' + items[i][name] + ".csv";
      $scope.grid_b[i].data = jinqData.select();
    }
  };
  $scope.$watch(pivot.item, populate_grid_b);
  $scope.$watch('grid_b_name', populate_grid_b);
  // } GRID B

  // STARTUP {
  $scope.format_mt = 1;
  // create a grid for each column in a list
  $scope.grid_a = new Array();

  // default database
  $scope.db = 'default';
  // check if we have a alternative database on the query string
  var m = window.location.search.match(/db=(\w+)/);
  if(m) {
    $scope.db = m[1];
  }

  // when database mask changes, we cant make changes direcly
  // instead trigger a database update which in turn will read the mask
  $scope.$watch('breakdown_mask', watchUrl);
  $scope.$watch(database.ready, function (newValue, oldValue){
    if(! newValue) return;
    pivot.parse_breakdown_mask($scope.breakdown_mask);
    var basebreakdown = pivot.getBaseBreakdown();
    
    if(basebreakdown.length > 0) {
      $scope.grid_b_name = basebreakdown[basebreakdown.length-1];
    }

    if($scope.grid_a.length != basebreakdown.length) {
      $scope.grid_a.length = basebreakdown.length;
      for(var g=0; g < basebreakdown.length; g++) {
        $scope.grid_a[g] = grid_a_Factory(g, basebreakdown[g]);
      }
    }
  });
  
  $scope.changeMode();

  // } STARTUP
});
// EOF - app.js
