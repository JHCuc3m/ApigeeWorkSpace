# Apigee Workspace: Proxy Endpoint Validations

## Overview

This repository contains an Apigee workspace that focuses on validating proxy endpoints. These validations automate checks against the API definitions specified in the `resources/oas/openapi.json` file.

## Validations Included

### 1. Message Body Parameters Validation
- **Policy:** `<OASValidation>`
- **Description:** Validates the request body parameters to ensure compliance with the OpenAPI Specification.
- **Reference:** [OASValidation Policy Documentation](https://cloud.google.com/apigee/docs/api-platform/reference/policies/oas-validation-policy)

### 2. Scope Validation
- **Script:** `resources/jsc/checkOpenapiScopes.js`
- **Description:** A custom JavaScript validation script that verifies the presence of required scopes in API requests.

### 3. Status Code Validation
- **Script:** `resources/jsc/raiseGenericFault.js`
- **Description:** A custom JavaScript script that checks and returns appropriate HTTP status codes based on validation outcomes.
