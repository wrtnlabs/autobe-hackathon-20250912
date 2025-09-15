import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system admin can view insurance API integration details.
 *
 * Scenario:
 *
 * 1. Register a new system admin with provider 'local', unique business email,
 *    and password.
 * 2. Log in as the created admin to establish authentication.
 * 3. Create an insurance API integration config with POST, specifying required
 *    fields.
 * 4. Retrieve the detailed config via GET with the id obtained from creation.
 * 5. Assert response contains all schema fields and correct organization
 *    linkage.
 * 6. Negative case: GET with random UUID, verify error (not found/forbidden),
 *    no sensitive data returned.
 */
export async function test_api_insurance_api_integration_detail_view_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@enterprise-corp.com`;
  const adminFullName = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Log in as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Create insurance API integration
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const vendorCode = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const connectionUri = `https://api.${RandomGenerator.alphaNumeric(6)}.com/v1`;
  const transactionTypes = "eligibility,claims";
  const status = RandomGenerator.pick(["active", "test", "failed"] as const);
  const integration =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      {
        body: {
          organization_id: orgId,
          insurance_vendor_code: vendorCode,
          connection_uri: connectionUri,
          supported_transaction_types: transactionTypes,
          status,
        } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate,
      },
    );
  typia.assert(integration);
  // 4. Retrieve details with the returned id
  const detail =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.at(
      connection,
      {
        insuranceApiIntegrationId: integration.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "integration details match create schema and linkage",
    detail.healthcare_platform_organization_id,
    orgId,
  );
  TestValidator.equals(
    "integration details basic field match",
    {
      insurance_vendor_code: detail.insurance_vendor_code,
      connection_uri: detail.connection_uri,
      supported_transaction_types: detail.supported_transaction_types,
      status: detail.status,
    },
    {
      insurance_vendor_code: vendorCode,
      connection_uri: connectionUri,
      supported_transaction_types: transactionTypes,
      status,
    },
  );
  // Ensure audit and metadata fields
  TestValidator.predicate(
    "integration created_at is ISO date-time",
    !!detail.created_at && typeof detail.created_at === "string",
  );
  TestValidator.predicate(
    "integration updated_at is ISO date-time",
    !!detail.updated_at && typeof detail.updated_at === "string",
  );
  // 5. Error scenario: using a random UUID returns error
  await TestValidator.error(
    "GET with random invalid insuranceApiIntegrationId returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.at(
        connection,
        {
          insuranceApiIntegrationId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
