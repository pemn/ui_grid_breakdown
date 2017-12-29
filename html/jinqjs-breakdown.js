//javascript
/*
  Copyright 2017 Vale
 
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
 
  http://www.apache.org/licenses/LICENSE-2.0
*/

// breakdown------------------------------------
// deliberately public function, since other modules may use it
// for a database, create a list of rows that belong to the same breakdown basket
var breakdown_findRows = function(result, args){
  // create a list of the breakdown columns (ie.: groupby columns)
  // all others must have a operation associated (aggregated)
  var groupcols = new Array();
  for(var i = 0 ; i < args.length ; i++){
    if( typeof args[i] === "string"){
      groupcols.push(args[i]);
    } else if(args[i].length == 1){ // breakdown columns
      groupcols.push(args[i][0]);
    }
  }

  // this variable will store the first source data row of a group
  // which will be used when checking if following rows are similar to it
  // or they should start a new group
  var groups = new Array();

  // this function will return a numeric index
  // identifying the group that this row belongs
  // this is the naive implementation using a lookup table
  // a more efficient implementation uses a tree of dictionaries
  // where branches are pointers which are followed until a scalar is reached
  var findGroup = function(row){
    var index = 0;
    var found = false;
    for(var i=0; i < groups.length; i++){
      found = true;
      for(var j=0;j < groupcols.length; j++){
        var col = groupcols[j];
        if(groups[i][col] != row[col]){
          found = false;
          break;
        }
      }
      if(found) break;
    }
    if(found){
      index = i;
    } else {
      index = groups.length;
      groups.push(row);
    }
    return(index);
  };
  
  // create a irregular table
  // with one dimension for each group
  // and a second dimension storing the data rows that belong to that group
  var rows = new Array();
  result.forEach(function (row, i){
    var j = findGroup(row);
    if(j >= rows.length){
      rows.push(new Array());
    }
    rows[j].push(i);
  });
  return(rows);
}

// Breakdown: Weighted agregation using template
// this plugin is a port of the funcionality of Perl function breakdown()
// Check github/pemn/Namedtable/Namedtable.pm for details
jinqJs.addPlugin('breakdown', function(result, args, store){
  var rows = breakdown_findRows(result, args);
  // perform field aggregation according to the operation specified for each
  var table = new Array();
  for(var j = 0; j < rows.length; j++){
    //var row = new Array();
    var row = new Array();
    var row_aux = new Array();
    var row_obj = {};
    for(var i = 0; i < args.length; i++){
      var col = '';
      if (args[i].length > 0) {
        col = args[i][0];
      }
      var col_type = undefined;
      if (args[i].length == 1) {
        row[i] = result[rows[j][0]][col];
      } else {
        col_type = args[i][1];
        for(var k = 0; k < rows[j].length; k++){
          var value = parseFloat(result[rows[j][k]][col]) || 0;
          var weight = 1;
          for(var l = 2; l < args[i].length; l++){
            if (args[i][l] in result[rows[j][k]]) {
              weight *= parseFloat(result[rows[j][k]][args[i][l]]) || 1;
            } else {
              weight *= parseFloat(args[i][l]) || 1;
            }
          }
          if (col_type == "sum") {
            row[i] = (row[i] || 0) + value * weight;
          } else if(col_type == "average" || col_type == "mean"){
            // sum of weight values
            row_aux[i] = (row_aux[i] || 0) + weight;
            // online algorithm to calculate the mean
            row[i] = row[i] ? (row[i] + (value - row[i]) * weight / row_aux[i]) : value;
          } else if(row[i] === undefined || (col_type == "min" && row[i] > value ) || (col_type == "max" && row[i] < value )){
            row[i] = value;
          }
        }
      }
      row_obj[col + (col_type ? ' [' + col_type +"]" : '')] = row[i];
    }
    table.push(row_obj);
  }
  return(new jinqJs().from(table));
});
// breakdown ------------------------------------
