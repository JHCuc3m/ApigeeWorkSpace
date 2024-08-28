const fs = require("fs");
const yaml = require("js-yaml");

// Read the Swagger YAML file
const swaggerFile = "./petstore.yaml";
const swaggerData = yaml.load(fs.readFileSync(swaggerFile, "utf8"));

// Function to generate XML policy
function generateXMLPolicy(swaggerData) {
  // Extract scopes from the security definitions
  const securitySchemes = swaggerData.components.securitySchemes;
  let scopes = [];

  for (const scheme in securitySchemes) {
    if (securitySchemes[scheme].type === "oauth2") {
      const flows = securitySchemes[scheme].flows;
      for (const flow in flows) {
        scopes = scopes.concat(Object.keys(flows[flow].scopes));
      }
    }
  }

  // Join scopes with a space
  const scopeString = scopes.join(" ");

  // Construct the XML policy
  const xmlPolicy = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 async="false" continueOnError="false" enabled="true" name="OAuthV2-VerifyAccessToken">
  <DisplayName>OAuth v2 Verify Access Token</DisplayName>
  <Operation>VerifyAccessToken</Operation>
  <ExternalAuthorization>false</ExternalAuthorization>
  <AccessToken>{request.queryparam.access_token}</AccessToken>
  <Scope>${scopeString}</Scope>
  <GenerateResponse enabled="true"/>
</OAuthV2>`;

  return xmlPolicy;
}

// Generate the XML policy
const xmlPolicy = generateXMLPolicy(swaggerData);

// Output the XML policy
console.log(xmlPolicy);

// Optionally, save the XML policy to a file
fs.writeFileSync("./scopes/scope.xml", xmlPolicy, "utf8");
