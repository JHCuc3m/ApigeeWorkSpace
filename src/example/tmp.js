const fs = require("fs");

const openApiDefinition = {
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
        security: [
          {
            petstore_auth: ["write:pets", "read:pets"],
          },
        ],
      },
    },
  },
  definitions: {
    Pet: {
      type: "object",
      required: ["name", "photoUrls"],
      properties: {
        id: { type: "integer", format: "int64" },
        category: { $ref: "#/definitions/Category" },
        name: { type: "string", example: "doggie" },
        photoUrls: {
          type: "array",
          xml: { name: "photoUrl", wrapped: true },
          items: { type: "string" },
        },
        tags: {
          type: "array",
          xml: { name: "tag", wrapped: true },
          items: { $ref: "#/definitions/Tag" },
        },
        status: {
          type: "string",
          description: "pet status in the store",
          enum: ["available", "pending", "sold"],
        },
      },
      xml: { name: "Pet" },
    },
  },
};

const generateXML = (openApi) => {
  const path = Object.keys(openApi.paths)[0];
  const method = Object.keys(openApi.paths[path])[0];
  const operation = openApi.paths[path][method];

  return `
<Policies>
    <!-- Path checking -->
    <VerifyAPIKey async="false" continueOnError="false" enabled="true" name="Verify-API-Key">
        <DisplayName>Verify API Key</DisplayName>
        <APIKey ref="request.queryparam.apikey"/>
        <Source>request.header.apikey</Source>
        <Verifier>
            <Parameter>apikey</Parameter>
        </Verifier>
    </VerifyAPIKey>

    <!-- Operation checking -->
    <AssignMessage name="Assign-Operation">
        <AssignVariable>
            <Name>operation</Name>
            <Value>${operation.operationId}</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>method</Name>
            <Value>${method.toUpperCase()}</Value>
        </AssignVariable>
        <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
    </AssignMessage>

    <!-- Security definitions -->
    <OAuthV2 async="false" continueOnError="false" enabled="true" name="OAuthV2-VerifyAccessToken">
        <DisplayName>OAuth v2 Verify Access Token</DisplayName>
        <Operation>VerifyAccessToken</Operation>
        <AccessToken>{request.queryparam.access_token}</AccessToken>
        <Scopes>
            <Scope>${operation.security[0].petstore_auth.join(
              "</Scope>\n            <Scope>"
            )}</Scope>
        </Scopes>
    </OAuthV2>

    <!-- Method checking -->
    <StepDefinition name="MethodCheck-AddPet">
        <Condition>(proxy.pathsuffix MatchesPath "${path}") and (request.verb = "${method.toUpperCase()}")</Condition>
    </StepDefinition>

    <!-- Format validation -->
    <ValidateRequest name="Validate-Request-Format">
        <Source>request</Source>
        <Schemas>
            <Schema id="jsonSchema">
                <SchemaValue>{  
                    "type": "object",
                    "properties": {
                        "body": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "integer" },
                                "name": { "type": "string" },
                                "photoUrls": {
                                    "type": "array",
                                    "items": { "type": "string" }
                                },
                                "status": {
                                    "type": "string",
                                    "enum": ["available", "pending", "sold"]
                                }
                            },
                            "required": ["name", "photoUrls"]
                        }
                    }
                }</SchemaValue>
            </Schema>
        </Schemas>
        <RequestValidation>
            <Message>Invalid request format</Message>
            <Variable>request</Variable>
            <SchemaRef>jsonSchema</SchemaRef>
        </RequestValidation>
    </ValidateRequest>

    <!-- Object parameters checking -->
    <ExtractVariables name="Extract-Parameters">
        <Source>request</Source>
        <JSONPayload>
            <Variable name="petName" type="string">
                <JSONPath>$.name</JSONPath>
            </Variable>
            <Variable name="photoUrls" type="array">
                <JSONPath>$.photoUrls</JSONPath>
            </Variable>
        </JSONPayload>
    </ExtractVariables>

    <RaiseFault async="false" continueOnError="false" enabled="true" name="Raise-Fault-Invalid-Parameters">
        <DisplayName>Raise Fault Invalid Parameters</DisplayName>
        <FaultRules>
            <FaultRule>
                <Condition>(petName = "") or (photoUrls = "")</Condition>
                <Step>
                    <Name>Fault-Parameter-Missing</Name>
                </Step>
            </FaultRule>
        </FaultRules>
        <FaultResponse>
            <Set>
                <Headers/>
                <Payload contentType="application/json">{ "error": "Invalid or missing parameters" }</Payload>
                <StatusCode>422</StatusCode>
                <ReasonPhrase>Unprocessable Entity</ReasonPhrase>
            </Set>
        </FaultResponse>
    </RaiseFault>

    <!-- Customized error raising -->
    <RaiseFault async="false" continueOnError="false" enabled="true" name="Raise-Fault-Invalid-Input">
        <DisplayName>Raise Fault Invalid Input</DisplayName>
        <FaultRules>
            <FaultRule>
                <Condition>(request.header.Content-Type != "application/json") and (request.header.Content-Type != "application/xml")</Condition>
                <Step>
                    <Name>Fault-Invalid-Input</Name>
                </Step>
            </FaultRule>
        </FaultRules>
        <FaultResponse>
            <Set>
                <Headers/>
                <Payload contentType="application/json">{ "error": "Invalid input format" }</Payload>
                <StatusCode>400</StatusCode>
                <ReasonPhrase>Bad Request</ReasonPhrase>
            </Set>
        </FaultResponse>
    </RaiseFault>

</Policies>

<ProxyEndpoints>
    <ProxyEndpoint name="default">
        <PreFlow name="PreFlow">
            <Request>
                <Step>
                    <Name>Verify-API-Key</Name>
                </Step>
                <Step>
                    <Name>OAuthV2-VerifyAccessToken</Name>
                </Step>
            </Request>
            <Response/>
        </PreFlow>
        <Flows>
            <Flow name="AddPet">
                <Description>${operation.summary}</Description>
                <Request>
                    <Step>
                        <Name>Assign-Operation</Name>
                    </Step>
                    <Step>
                        <Name>MethodCheck-AddPet</Name>
                    </Step>
                    <Step>
                        <Name>Validate-Request-Format</Name>
                    </Step>
                    <Step>
                        <Name>Extract-Parameters</Name>
                    </Step>
                    <Step>
                        <Name>Raise-Fault-Invalid-Parameters</Name>
                    </Step>
                    <Step>
                        <Name>Raise-Fault-Invalid-Input</Name>
                    </Step>
                </Request>
                <Response/>
                <Condition>(proxy.pathsuffix MatchesPath "${path}") and (request.verb = "${method.toUpperCase()}")</Condition>
            </Flow>
        </Flows>
        <PostFlow name="PostFlow">
            <Request/>
            <Response/>
        </PostFlow>
        <HTTPProxyConnection>
            <BasePath>/v1</BasePath>
            <VirtualHost>default</VirtualHost>
        </HTTPProxyConnection>
        <RouteRule name="default">
            <TargetEndpoint>default</TargetEndpoint>
        </RouteRule>
    </ProxyEndpoint>
</ProxyEndpoints>

<TargetEndpoints>
    <TargetEndpoint name="default">
        <HTTPTargetConnection>
            <URL>https://your-backend-service</URL>
        </HTTPTargetConnection>
    </TargetEndpoint>
</TargetEndpoints>
`;
};

const xmlContent = generateXML(openApiDefinition);
fs.writeFileSync("apigee-policy.xml", xmlContent);
console.log("Apigee policy XML has been generated.");
