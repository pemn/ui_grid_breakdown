//javascript
/*
  Copyright 2017 Vale
 
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
 
  http://www.apache.org/licenses/LICENSE-2.0
*/

// expand each no-pivot column to every unique value of the repivot column
jinqJs.addPlugin('round', function(result, args, store){
  for(var j = 0; j < result.length; j++){
    for(var i = 0 ; i < args.length ; i++){
      var k = args[i][0];
      var r = undefined;
      // first try a direct column name match
      if(args[i].length > 1) {

        // check if the columns is a index
        if(! (k in result[j]) && typeof(k) == "number") {
          k = Object.keys(result[j])[k];
        }

        // check if column was renamed by breakdown
        if(! (k in result[j])) {
          k += ' [' + args[i][1] +"]";
        }
        if(args[i][1] === "sum") {
          result[j][k] = Math.round(result[j][k] / 1000000);
        }
        if(args[i][1] === "average") {
          result[j][k] = Math.round(result[j][k] * 100) / 100;
        }
      }
    }
  }
  return(new jinqJs().from(result));
});
