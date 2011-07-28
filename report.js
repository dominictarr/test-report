

module.exports = Reporter

var stati = 
    { started: 'started'
    , success: 'success'
    , failure: 'failure'
    ,   error: 'error' }
  , order = [stati.success, stati.failure, stati.error]
  , assert = require('assert')

Reporter.status = stati

function update(old, newer){
  var o = order.indexOf(old)
    , n = order.indexOf(newer)
    
    return order[o > n ? o : n]
}

function min (array,func){
  var m = 'success'
  for(var i in array){
    var n = func(array[i],i,array)
    if(n && n < m)
      m = n
  }
  return m
}

function getStatus (test){
  var m = min(test.failures,function (e){
        if(e && e.name && e.name === "AssertionError")
          return stati.failure
        return stati.error
      })
    , n = test.tests ? min (test.tests, function (e) {
        return getStatus(e)
      }) : 'success'
  return n < m ? n : m
}

function failureCount (test){
  return test.failures.length + 
    ( test.tests ? test.tests.map(failureCount).reduce(function (x, y) {
          return x + y
      }) : 0 )
}


function test(name,failures) {
  return  { 
    name: name
  , failures: failures || []
  , get status () { return getStatus(this) }
  , get failureCount () { return failureCount(this) }
  }
}

function find (ary, n) {
  for (var i in ary) {
    if (ary[i].name === n)
      return ary[i]
  }
}
function get(report,path) {
  if ('string' === typeof path) 
    path = [path]
  if (!path.length)
    return report
  var f = find(report.tests, path[0])
  if (!f) {
    f = test(path[0],[])
    if (!report.tests) 
      report.tests = []
    report.tests.push(f)
  }
  return get(f,path.slice(1))
}

Reporter.prototype = {
  subreport: function (name) {
    var subreporter = new Reporter (name)
    this.test(subreporter.report)
    return subreporter
  }, 
  test: function (name,error){
    var t
    if (Array.isArray(name) || 'string' === typeof name) {
      var t = get(this.report,name)
      if (arguments.length > 1)
        t.failures.push(error)
    }
    else if ('object' === typeof name)
      this.report.tests.push(name)
    return this
  },
  error: function (err){
    this.report.failures.push (err)
    
    return this
  },
  meta: function (key,value){
    this.report.meta[key] = value
    
    return this
  }
}

function Reporter (filename){
  if(!(this instanceof Reporter)) return new Reporter(filename)

  var r = this.report = test (filename)
  
  r.filename = filename
  r.os = process.platform
  r.version = process.version
  r.meta = {}
  r.tests = [] 
}
