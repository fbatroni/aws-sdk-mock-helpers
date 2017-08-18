const AWS = require('aws-sdk'),
      sinon = require('sinon');

exports.clear = function() {
  AWS.S3.restore();
  mockS3.clear();
}

// Can optionally list any number of trasitive dependencies to reload, after the main lib.
exports.mockFor = function(lib) {
  sinon.stub(AWS, 'S3').returns(mockS3);
  for (var i = 1; i < arguments.length; i++) {
    delete require.cache[require.resolve(arguments[i])];
  }
  delete require.cache[require.resolve(lib)];
  return require(lib);
}

exports.putMockObject = function(params) {
  mockS3.putObject(params, function() {});
}

var mockS3 = {
  'objects': {},
  'metadata': {},
  'clear': function() {
    this.objects = {};
    this.metadata = {};
  },
  'copyObject': function(params, callback) {
    if (!params.CopySource) throw {"code": "MissingRequiredParameter", message: "Missing required key 'CopySource' in params"};
    var fullKey = params.Bucket + "/" + params.Key;
    if (params.Metadata) this.metadata[fullKey] = params.Metadata;
    callback(null, {"ETag": "s3-object-tag"});
  },
  'getObject': function(params, callback) {
    var fullKey = params.Bucket + "/" + params.Key;
    var object = this.objects[fullKey];
    if (params.Range) {
      var matches = params.Range.match(/bytes=(\d+)-(\d+)/);
      if (matches[1] && matches[2]) {
        object = object.substr(parseInt(matches[1]), parseInt(matches[2]));
      }
    }

    if (object) {
      callback(null, {Body: new Buffer(object), ContentLength: object.length, Metadata: this.metadata[fullKey] });
    } else {
      callback(new Error("Object [" + fullKey + "] not found"));
    }
  },
  'headObject': function(params, callback) {
    var fullKey = params.Bucket + "/" + params.Key;
    var object = this.objects[fullKey];

    if (object) {
      callback(null, { ContentLength: object.length, Metadata: this.metadata[fullKey] });
    } else {
      callback(new Error("Object [" + fullKey + "] not found"));
    }
  },
  'putObject': function(params, callback) {
    var fullKey = params.Bucket + "/" + params.Key;
    this.objects[fullKey] = params.Body;
    if (params.Metadata) this.metadata[fullKey] = params.Metadata;
    callback(null, {"ETag": "s3-object-tag"});
  }
}