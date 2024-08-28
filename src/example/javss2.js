const builder = require("xmlbuilder");

function generateApigeePolicies(openApiSpec) {
  const { paths, securityDefinitions } = openApiSpec;
  const policies = builder.create("Policies");

  // Function to create VerifyAPIKey policy
  function createVerifyAPIKeyPolicy() {
    const verifyApiKey = policies.ele("VerifyAPIKey", {
      async: "false",
      continueOnError: "false",
      enabled: "true",
      name: "Verify-API-Key",
    });
    verifyApiKey.ele("DisplayName").text("Verify API Key");
    verifyApiKey.ele("APIKey", { ref: "request.queryparam.apikey" });
    verifyApiKey.ele("Source").text("request.header.apikey");
    verifyApiKey.ele("Verifier").ele("Parameter").text("apikey");
  }

  // Function to create AssignMessage policy
  function createAssignMessagePolicy(operationId) {
    const assignMessage = policies.ele("AssignMessage", {
      name: `Assign-Operation-${operationId}`,
    });
    assignMessage
      .ele("AssignVariable")
      .ele("Name")
      .text("operation")
      .up()
      .ele("Value")
      .text(operationId);
    assignMessage
      .ele("AssignVariable")
      .ele("Name")
      .text("method")
      .up()
      .ele("Value")
      .text("POST");
    assignMessage.ele("IgnoreUnresolvedVariables").text("false");
  }

  // Function to create OAuthV2 policy
  function createOAuthV2Policy() {
    const oAuthV2 = policies.ele("OAuthV2", {
      async: "false",
      continueOnError: "false",
      enabled: "true",
      name: "OAuthV2-VerifyAccessToken",
    });
    oAuthV2.ele("DisplayName").text("OAuth v2 Verify Access Token");
    oAuthV2.ele("Operation").text("VerifyAccessToken");
    oAuthV2.ele("AccessToken").text("{request.queryparam.access_token}");
    const scopes = oAuthV2.ele("Scopes");
    Object.keys(securityDefinitions.petstore_auth.scopes).forEach((scope) => {
      scopes.ele("Scope").text(scope);
    });
  }

  // Function to create StepDefinition policy
  function createStepDefinitionPolicy(operationId) {
    const stepDefinition = policies.ele("StepDefinition", {
      name: `MethodCheck-${operationId}`,
    });
    stepDefinition
      .ele("Condition")
      .text(
        `(proxy.pathsuffix MatchesPath "/pet") and (request.verb = "POST")`
      );
  }

  // Function to create ValidateRequest policy
  function createValidateRequestPolicy() {
    const validateRequest = policies.ele("ValidateRequest", {
      name: "Validate-Request-Format",
    });
    validateRequest.ele("Source").text("request");
    const schemas = validateRequest.ele("Schemas");
    const schema = schemas.ele("Schema", { id: "jsonSchema" });
    schema.ele("SchemaValue").text(
      JSON.stringify({
        type: "object",
        properties: {
          body: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              photoUrls: {
                type: "array",
                items: { type: "string" },
              },
              status: {
                type: "string",
                enum: ["available", "pending", "sold"],
              },
            },
            required: ["name", "photoUrls"],
          },
        },
      })
    );
    const requestValidation = validateRequest.ele("RequestValidation");
    requestValidation.ele("Message").text("Invalid request format");
    requestValidation.ele("Variable").text("request");
    requestValidation.ele("SchemaRef").text("jsonSchema");
  }

  // Function to create ExtractVariables policy
  function createExtractVariablesPolicy() {
    const extractVariables = policies.ele("ExtractVariables", {
      name: "Extract-Parameters",
    });
    const source = extractVariables.ele("Source").text("request");
    const jsonPayload = extractVariables.ele("JSONPayload");
    jsonPayload
      .ele("Variable", { name: "petName", type: "string" })
      .ele("JSONPath")
      .text("$.name");
    jsonPayload
      .ele("Variable", { name: "photoUrls", type: "array" })
      .ele("JSONPath")
      .text("$.photoUrls");
  }

  // Function to create RaiseFault policy for invalid parameters
  function createRaiseFaultInvalidParametersPolicy() {
    const raiseFault = policies.ele("RaiseFault", {
      async: "false",
      continueOnError: "false",
      enabled: "true",
      name: "Raise-Fault-Invalid-Parameters",
    });
    raiseFault.ele("DisplayName").text("Raise Fault Invalid Parameters");
    const faultRules = raiseFault.ele("FaultRules").ele("FaultRule");
    faultRules.ele("Condition").text('(petName = "") or (photoUrls = "")');
    faultRules.ele("Step").ele("Name").text("Fault-Parameter-Missing");
    const faultResponse = raiseFault.ele("FaultResponse").ele("Set");
    faultResponse.ele("Headers");
    faultResponse
      .ele("Payload", { contentType: "application/json" })
      .text('{ "error": "Invalid or missing parameters" }');
    faultResponse.ele("StatusCode").text("422");
    faultResponse.ele("ReasonPhrase").text("Unprocessable Entity");
  }

  // Function to create RaiseFault policy for invalid input
  function createRaiseFaultInvalidInputPolicy() {
    const raiseFault = policies.ele("RaiseFault", {
      async: "false",
      continueOnError: "false",
      enabled: "true",
      name: "Raise-Fault-Invalid-Input",
    });
    raiseFault.ele("DisplayName").text("Raise Fault Invalid Input");
    const faultRules = raiseFault.ele("FaultRules").ele("FaultRule");
    faultRules
      .ele("Condition")
      .text(
        '(request.header.Content-Type != "application/json") and (request.header.Content-Type != "application/xml")'
      );
    faultRules.ele("Step").ele("Name").text("Fault-Invalid-Input");
    const faultResponse = raiseFault.ele("FaultResponse").ele("Set");
    faultResponse.ele("Headers");
    faultResponse
      .ele("Payload", { contentType: "application/json" })
      .text('{ "error": "Invalid input format" }');
    faultResponse.ele("StatusCode").text("400");
    faultResponse.ele("ReasonPhrase").text("Bad Request");
  }

  // Creating the policies
  createVerifyAPIKeyPolicy();
  createAssignMessagePolicy("addPet");
  createOAuthV2Policy();
  createStepDefinitionPolicy("AddPet");
  createValidateRequestPolicy();
  createExtractVariablesPolicy();
  createRaiseFaultInvalidParametersPolicy();
  createRaiseFaultInvalidInputPolicy();

  const proxyEndpoints = builder.create("ProxyEndpoints");
  const proxyEndpoint = proxyEndpoints.ele("ProxyEndpoint", {
    name: "default",
  });
  const preFlow = proxyEndpoint
    .ele("PreFlow", { name: "PreFlow" })
    .ele("Request");
  preFlow.ele("Step").ele("Name").text("Verify-API-Key");
  preFlow.ele("Step").ele("Name").text("OAuthV2-VerifyAccessToken");

  const flows = proxyEndpoint.ele("Flows");
  const flow = flows.ele("Flow", { name: "AddPet" });
  flow.ele("Description").text("Add a new pet to the store");
  const request = flow.ele("Request");
  request.ele("Step").ele("Name").text("Assign-Operation-addPet");
  request.ele("Step").ele("Name").text("MethodCheck-AddPet");
  request.ele("Step").ele("Name").text("Validate-Request-Format");
  request.ele("Step").ele("Name").text("Extract-Parameters");
  request.ele("Step").ele("Name").text("Raise-Fault-Invalid-Parameters");
  request.ele("Step").ele("Name").text("Raise-Fault-Invalid-Input");
  flow.ele("Response");
  flow
    .ele("Condition")
    .text('(proxy.pathsuffix MatchesPath "/pet") and (request.verb = "POST")');

  proxyEndpoint
    .ele("PostFlow", { name: "PostFlow" })
    .ele("Request")
    .up()
    .ele("Response");
  const httpProxyConnection = proxyEndpoint.ele("HTTPProxyConnection");
  httpProxyConnection.ele("BasePath").text("/v2");
  httpProxyConnection.ele("VirtualHost").text("default");
  proxyEndpoint
    .ele("RouteRule", { name: "default" })
    .ele("TargetEndpoint")
    .text("default");

  const targetEndpoints = builder.create("TargetEndpoints");
  const targetEndpoint = targetEndpoints.ele("TargetEndpoint", {
    name: "default",
  });
  targetEndpoint
    .ele("HTTPTargetConnection")
    .ele("URL")
    .text("https://petstore.swagger.io");

  return (
    policies.end({ pretty: true }) +
    "\n" +
    proxyEndpoints.end({ pretty: true }) +
    "\n" +
    targetEndpoints.end({ pretty: true })
  );
}

// Example usage
const openApiSpec = {
  paths: {
    "/pet": {
      post: {
        tags: ["pet"],
        summary: "Add a new pet to the store",
        description: "",
        operationId: "addPet",
        consumes: ["application/json", "application/xml"],
        produces: ["application/xml", "application/json"],
        parameters: [
          {
            in: "body",
            name: "body",
            description: "Pet object that needs to be added to the store",
            required: true,
            schema: {
              $ref: "#/definitions/Pet",
            },
          },
        ],
        responses: {
          400: { description: "Invalid input" },
          422: { description: "Validation exception" },
        },
        security: [{ petstore_auth: ["write:pets", "read:pets"] }],
      },
    },
  },
  securityDefinitions: {
    petstore_auth: {
      type: "oauth2",
      authorizationUrl: "http://petstore.swagger.io/oauth/dialog",
      flow: "implicit",
      scopes: {
        "write:pets": "modify pets in your account",
        "read:pets": "read your pets",
      },
    },
    api_key: {
      type: "apiKey",
      name: "api_key",
      in: "header",
    },
  },
};

console.log(generateApigeePolicies(openApiSpec));
