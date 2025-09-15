import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin can fetch their insurance integration config by
 * ID, with protection against cross-org and not found.
 *
 * 1. Register new organization admin (org context isolation)
 * 2. Login as admin
 * 3. Create a new insurance API integration for that org
 * 4. Retrieve the integration by ID and validate its detail fields
 * 5. Negative: Try GET with a random (non-existent) ID, confirm error
 */
export async function test_api_insurance_api_integration_detail_view_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphabets(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(orgAdmin);

  // 2. Login as admin (populates Authorization header)
  const loginOutput = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      },
    },
  );
  typia.assert(loginOutput);

  // 3. Create insurance API integration for org
  const integrationInput = {
    organization_id: orgAdmin.id,
    insurance_vendor_code: RandomGenerator.paragraph({ sentences: 2 }),
    connection_uri:
      "https://" + RandomGenerator.alphaNumeric(10) + ".insurance.test/api",
    supported_transaction_types: "eligibility,claims",
    status: RandomGenerator.pick(["active", "test", "failed"] as const),
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;

  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.create(
      connection,
      {
        body: integrationInput,
      },
    );
  typia.assert(integration);
  TestValidator.equals(
    "integration org linkage matches",
    integration.healthcare_platform_organization_id,
    integrationInput.organization_id,
  );
  TestValidator.equals(
    "insurance_vendor_code matches",
    integration.insurance_vendor_code,
    integrationInput.insurance_vendor_code,
  );
  TestValidator.equals(
    "connection_uri matches",
    integration.connection_uri,
    integrationInput.connection_uri,
  );
  TestValidator.equals(
    "supported_transaction_types matches",
    integration.supported_transaction_types,
    integrationInput.supported_transaction_types,
  );
  TestValidator.equals(
    "status matches",
    integration.status,
    integrationInput.status,
  );
  TestValidator.predicate(
    "integration has valid id",
    typeof integration.id === "string" && integration.id.length > 0,
  );
  TestValidator.predicate(
    "integration created_at and updated_at are present",
    typeof integration.created_at === "string" &&
      typeof integration.updated_at === "string",
  );

  // 4. Retrieve integration detail by ID and assert all fields
  const detail =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.at(
      connection,
      {
        insuranceApiIntegrationId: integration.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("returned id matches", detail.id, integration.id);
  TestValidator.equals(
    "org id matches",
    detail.healthcare_platform_organization_id,
    integrationInput.organization_id,
  );
  TestValidator.equals(
    "vendor matches",
    detail.insurance_vendor_code,
    integrationInput.insurance_vendor_code,
  );
  TestValidator.equals(
    "uri matches",
    detail.connection_uri,
    integrationInput.connection_uri,
  );
  TestValidator.equals(
    "supported_transaction_types matches",
    detail.supported_transaction_types,
    integrationInput.supported_transaction_types,
  );
  TestValidator.equals(
    "status matches",
    detail.status,
    integrationInput.status,
  );
  TestValidator.predicate(
    "created_at and updated_at present",
    typeof detail.created_at === "string" &&
      typeof detail.updated_at === "string",
  );

  // 5. Negative case: GET with random/non-existent id (should error)
  await TestValidator.error(
    "GET with non-existent integration id returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceApiIntegrations.at(
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
