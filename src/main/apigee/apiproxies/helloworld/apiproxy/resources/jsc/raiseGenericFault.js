// Get the OpenAPI specification from an environment variable
var openapiSpec = context.getVariable("openapiSpec");
var SUBPATH = context.getVariable("proxy.pathsuffix");
var METHOD = context.getVariable("request.verb");
var STATUS_CODE = parseInt(context.getVariable("response.status.code"));

// Main function
function main() {
  // Parse the OpenAPI specification
  var swaggerData;
  try {
    swaggerData = JSON.parse(openapiSpec);
  } catch (err) {
    throw new Error("Error parsing OpenAPI specification");
  }

  if (verifyStatusCode(swaggerData)) {
    context.setVariable("raise_generic_fault", false);
  } else {
    context.setVariable("raise_generic_fault", true);
  }
}

/**
 * Verify if the status code is defined in the OpenAPI specification.
 * @param {object} swaggerData - The parsed OpenAPI data.
 * @returns {boolean} - True if the status code is defined, false otherwise.
 */
function verifyStatusCode(swaggerData) {
  for (var path in swaggerData.paths) {
    var subpath = path.replace(/{[^}]+}/g, "**"); // Convert path parameters to ** wildcard

    try {
      if (!SUBPATH.match(subpath)) {
        continue;
      }
    } catch (err) {
      throw new Error(SUBPATH);
    }

    for (var method in swaggerData.paths[path]) {
      // If METHOD does not match the method in the OpenAPI spec, continue to the next method
      if (METHOD.toUpperCase() !== method.toUpperCase()) {
        continue;
      }
      var operation = swaggerData.paths[path][method];

      // Get defined status codes for the operation
      var definedStatusCodes = Object.keys(operation.responses).map(Number);

      //throw new Error(definedStatusCodes);
      // If STATUS_CODE is not defined in the OpenAPI and is not 200, raise a fault
      if (!definedStatusCodes.includes(STATUS_CODE) && STATUS_CODE !== 200) {
        return false;
        //context.setVariable("raise_generic_fault", true);
        /*
        throw new Error(
          "Error: Status code is not defined in the OpenAPI specification"
        );*/
      } else {
        return true;
      }
    }
  }
  return false;
  //throw new Error("Error: Operation not found in the OpenAPI specification");
}

// Execute the main function
main();
