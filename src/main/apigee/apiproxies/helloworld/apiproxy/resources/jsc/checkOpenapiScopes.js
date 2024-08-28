// Get the OpenAPI specification from an environment variable
var openapiSpec = context.getVariable("openapiSpec");

// Get the scope from the context
var SCOPE = context.getVariable("oauthv2accesstoken.GetAcessTokenInfo.scope");

// Main function
function main() {
  // If SCOPE is not defined, then throw an error
  if (!SCOPE) {
    throw new Error("Checking scope: Scope is not defined");
  }

  // Parse the OpenAPI specification
  var swaggerData;
  try {
    swaggerData = JSON.parse(openapiSpec);
  } catch (err) {
    throw new Error("Error parsing OpenAPI specification");
  }

  // Verify the scope
  var isValidScope = verifyScope(SCOPE, swaggerData);
  if (!isValidScope) {
    throw new Error("Checking scope: Scope is invalid");
  }
}

/**
 * Extracts all securitySchemes of type oauth2 from the Swagger data.
 * @param {object} swaggerData - The parsed Swagger data.
 * @returns {array} - An array of securitySchemes of type oauth2.
 */
function extractScopes(swaggerData) {
  var oauth2s = [];
  var securitySchemes = swaggerData.components.securitySchemes || {};

  for (var scheme in securitySchemes) {
    if (securitySchemes[scheme].type === "oauth2") {
      oauth2s.push(scheme);
    }
  }

  return oauth2s;
}

/**
 * Verify current scope matches the scopes from the Swagger data for the operation.
 * @param {string} scope - The current scope of the token
 * @param {object} swaggerData - The parsed Swagger data.
 * @returns {boolean} - True if the scope is valid, false otherwise.
 */
function verifyScope(scope, swaggerData) {
  var oauth2s = extractScopes(swaggerData);

  for (var path in swaggerData.paths) {
    for (var method in swaggerData.paths[path]) {
      var operation = swaggerData.paths[path][method];
      // Check if the operation has a security definition
      if (operation.security) {
        // Iterate through the security definitions
        for (var i = 0; i < operation.security.length; i++) {
          var security = operation.security[i];
          // Get the scopes defined for each security scheme
          for (var scheme in security) {
            // If scheme is not oauth2, then skip
            if (oauth2s.indexOf(scheme) === -1) {
              continue;
            }
            var operationScopes = security[scheme];
            // Check if the current scopes have all the required operation scopes
            for (var j = 0; j < operationScopes.length; j++) {
              var operationScope = operationScopes[j];
              if (scope.split(" ").indexOf(operationScope) === -1) {
                //console.error("Scope " + operationScope + " is missing");
                return false;
              }
            }
          }
        }
      }
    }
  }
  return true;
}

// Execute the main function
main();
