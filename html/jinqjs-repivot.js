//javascript
/*
  Copyright 2017 Vale
 
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
 
  http://www.apache.org/licenses/LICENSE-2.0
*/

// expand each no-pivot column to every unique value of the repivot column
jinqJs.addPlugin('repivot', function(result, args, store){
  var vpivot;
  if(args.length > 0){
    vpivot = args[0];
  } else {
    vpivot = [Object.keys(result[0])[0]];
  }
  var vbreak;
  if(args.length > 1){
    vbreak = args[1];
  } else {
    vbreak = [Object.keys(result[0])[1]];
  }

  var vdata;
  if(args.length > 2){
    vdata = args[2];
  } else {
    vdata = [Object.keys(result[0])[2]];
  }

  // find every unique value of the repivot column
  var unique = new Array();

  for(var i = 0; i < result.length; i++){
    var revalue = result[i][vpivot[0]];
    for(var j = 1; j < vpivot.length; j++){
      revalue += "_" + result[i][vpivot[j]];
    }
      
    if( unique.indexOf(revalue) == -1){
      unique.push(revalue);
    }
  }
  // create a irregular table
  // with one dimension for each group
  // and a second dimension storing the data rows that belong to that group
  var rows = breakdown_findRows(result, vbreak);
  var table = new Array();
  for(var i = 0; i < rows.length; i++){
    table.push({});
    for(var j = 0; j < rows[i].length; j++){
      var row = result[rows[i][j]]
      if(j == 0){
        for(var k = 0; k < vbreak.length; k++){
          table[i][vbreak[k]] = row[vbreak[k]];
        }
        for(var k = 0; k < vdata.length; k++){
          for(var l = 0; l < unique.length; l++){
            table[i][vdata[k] + '_' + unique[l]] = 0;
          }
        }
      }
      for(var k = 0; k < vdata.length; k++){
        // skip weird values
        if (typeof(row[vdata[k]]) != "number") {
          continue;
        }
        var revalue = row[vpivot[0]];
        for(var l = 1; l < vpivot.length; l++){
          revalue += "_" + row[vpivot[l]];
        }
        table[i][vdata[k] + '_' + revalue] += row[vdata[k]];
      }
    }
  }
  return(new jinqJs().from(table));
});
