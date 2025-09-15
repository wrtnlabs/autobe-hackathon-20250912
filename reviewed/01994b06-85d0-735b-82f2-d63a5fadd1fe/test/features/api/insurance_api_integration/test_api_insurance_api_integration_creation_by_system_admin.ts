import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin ability to create insurance API integrations with
 * business rule enforcement and error handling.
 *
 * 1. Register as a new system admin account using valid random data (IJoin).
 * 2. Login as admin using the registration info (ILogin), session established.
 * 3. Compose IHealthcarePlatformInsuranceApiIntegration.ICreate payload with
 *    random, appropriately formatted data, using a valid UUID as
 *    organization_id.
 * 4. Call create integration API. Assert returned object is
 *    IHealthcarePlatformInsuranceApiIntegration; check all major fields are
 *    present and correct (id, organization_id, vendor code, uri,
 *    transaction types, status, created_at, updated_at).
 * 5. Attempt to create a duplicate (same organization_id and vendor code).
 *    Expect error.
 * 6. Omit required fields (e.g., send organization_id as empty string, or
 *    string fields empty) one at a time in separate requests; expect error
 *    each time.
 * 7. Use a random (non-existent) organization_id and valid info; expect error.
 */
export async function test_api_insurance_api_integration_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as admin.
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);
  const adminLogin = {
    email: adminJoin.email,
    provider: adminJoin.provider,
    provider_key: adminJoin.provider_key,
    password: adminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLogin,
  });
  typia.assert(loginResp);

  // 2. Create valid insurance integration
  const validIntegration = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    insurance_vendor_code: RandomGenerator.alphaNumeric(6),
    connection_uri: `https://api.${RandomGenerator.alphaNumeric(10)}.com/${RandomGenerator.alphaNumeric(6)}`,
    supported_transaction_types: "eligibility,claims",
    status: "active",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: validIntegration },
    );
  typia.assert(integration);
  TestValidator.equals(
    "integration organization linkage",
    integration.healthcare_platform_organization_id,
    validIntegration.organization_id,
  );
  TestValidator.equals(
    "integration vendor code matches",
    integration.insurance_vendor_code,
    validIntegration.insurance_vendor_code,
  );
  TestValidator.equals(
    "integration URI matches",
    integration.connection_uri,
    validIntegration.connection_uri,
  );
  TestValidator.equals(
    "integration transaction types matches",
    integration.supported_transaction_types,
    validIntegration.supported_transaction_types,
  );
  TestValidator.equals(
    "integration status is active",
    integration.status,
    "active",
  );

  // 3. Try to create a duplicate (should trigger uniqueness violation)
  await TestValidator.error(
    "duplicate integration uniqueness check",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
        connection,
        { body: validIntegration },
      );
    },
  );

  // 4. Send organization_id as empty string (invalid but type-correct)
  await TestValidator.error(
    "organization_id empty string validation",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
        connection,
        { body: { ...validIntegration, organization_id: "" } },
      );
    },
  );

  // 5. Omit required field (vendor code empty)
  await TestValidator.error("vendor code missing validation", async () => {
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: { ...validIntegration, insurance_vendor_code: "" } },
    );
  });

  // 6. Omit required field (connection_uri empty)
  await TestValidator.error("connection_uri missing validation", async () => {
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: { ...validIntegration, connection_uri: "" } },
    );
  });

  // 7. Use incorrect organization_id (simulate not found)
  const invalidOrgIntegration = {
    ...validIntegration,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.error("non-existent org id not allowed", async () => {
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: invalidOrgIntegration },
    );
  });
}
