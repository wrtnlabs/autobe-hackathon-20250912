import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful update of an insurance API integration by a system
 * admin.
 *
 * This test covers the following entire flow:
 *
 * 1. Register a new system admin (join)
 * 2. Login as the newly created admin
 * 3. Create a new organization
 * 4. Create a new insurance API integration under the organization
 * 5. Update the insurance API integration (change connection URI and status)
 * 6. Validate that the integration has been correctly updated:
 *
 *    - All values match the update payload
 *    - Immutable fields are unchanged
 *    - Audit log (created_at, updated_at) reflects the update
 *    - All type/format rules hold (UUID, email, URI, date-time, etc.)
 * 7. Edge case: Attempt to update to a duplicate (already used) URI triggers
 *    error
 * 8. Edge case: Attempt to update a soft-deleted integration triggers
 *    not-found error Success is confirmed by a returned updated integration
 *    object with all expected properties.
 */
export async function test_api_insurance_api_integration_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinPayload = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    { body: adminJoinPayload },
  );
  typia.assert(adminAuthorized);

  // 2. Login as the newly created admin (should refresh/reapply tokens)
  const adminLoginPayload = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoinPayload.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginPayload,
  });
  typia.assert(loginResult);

  // 3. Create a new organization
  const orgPayload = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgPayload },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization code should match",
    organization.code,
    orgPayload.code,
  );
  TestValidator.equals(
    "organization status",
    organization.status,
    orgPayload.status,
  );

  // 4. Create a new insurance API integration under this org
  const insuranceApiUri = `https://insurance-${RandomGenerator.alphaNumeric(8)}.api/platform`;
  const createIntegrationPayload = {
    organization_id: organization.id,
    insurance_vendor_code: RandomGenerator.alphaNumeric(4).toUpperCase(),
    connection_uri: insuranceApiUri,
    supported_transaction_types: "eligibility,claims",
    status: "active",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: createIntegrationPayload },
    );
  typia.assert(integration);
  TestValidator.equals(
    "integration URI should match",
    integration.connection_uri,
    createIntegrationPayload.connection_uri,
  );
  TestValidator.equals(
    "integration is active",
    integration.status,
    createIntegrationPayload.status,
  );

  // 5. Update the insurance API integration (change connection_uri and status)
  const updatedUri = `https://updated-${RandomGenerator.alphaNumeric(8)}.api/platform`;
  const updatePayload = {
    connection_uri: updatedUri,
    status: "test",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.update(
      connection,
      {
        insuranceApiIntegrationId: integration.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "integration id stays the same",
    updated.id,
    integration.id,
  );
  TestValidator.equals(
    "connection_uri updated",
    updated.connection_uri,
    updatedUri,
  );
  TestValidator.equals("status updated", updated.status, "test");
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    integration.updated_at,
  );
  TestValidator.equals(
    "immutable fields remain unchanged (org)",
    updated.healthcare_platform_organization_id,
    integration.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "vendor_code is unchanged",
    updated.insurance_vendor_code,
    integration.insurance_vendor_code,
  );

  // 6. Validate audit fields: created_at should remain, updated_at should be refreshed
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    integration.created_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    Date.parse(updated.updated_at) >= Date.parse(updated.created_at),
  );

  // 7. Edge Case: Try to update to an existing URI (should fail with validation error)
  const otherIntegrationPayload = {
    organization_id: organization.id,
    insurance_vendor_code: RandomGenerator.alphaNumeric(4).toUpperCase(),
    connection_uri: `https://unique-${RandomGenerator.alphaNumeric(8)}.api/platform`,
    supported_transaction_types: "eligibility,claims",
    status: "active",
  } satisfies IHealthcarePlatformInsuranceApiIntegration.ICreate;
  const otherIntegration =
    await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.create(
      connection,
      { body: otherIntegrationPayload },
    );
  typia.assert(otherIntegration);
  // Now try to update integration to otherIntegration's URI
  await TestValidator.error(
    "updating to duplicate connection_uri triggers validation error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.update(
        connection,
        {
          insuranceApiIntegrationId: integration.id,
          body: {
            connection_uri: otherIntegration.connection_uri,
          } satisfies IHealthcarePlatformInsuranceApiIntegration.IUpdate,
        },
      );
    },
  );

  // 8. Edge Case: Soft-delete the original integration (simulate by setting deleted_at via test manipulation if possible)
  // Since there is no soft-delete endpoint, we simulate by updating its status to 'failed' and then updating again when deleted_at is not null
  // (Assume backend soft-deletes on status change; if not, skip)
  // For now, forcibly test that updating a non-existent id triggers an error
  await TestValidator.error(
    "updating a non-existent/soft-deleted integration triggers a not-found error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceApiIntegrations.update(
        connection,
        {
          insuranceApiIntegrationId: typia.random<
            string & tags.Format<"uuid">
          >(),
          body: {
            connection_uri: updatedUri,
          } satisfies IHealthcarePlatformInsuranceApiIntegration.IUpdate,
        },
      );
    },
  );
}
