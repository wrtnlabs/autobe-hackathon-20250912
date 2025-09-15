import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";

/**
 * Test that an organization admin can successfully delete a pharmacy
 * integration.
 *
 * 1. Admin signs up (registers) via join API, generating a new admin and
 *    organization context.
 * 2. Admin logs in via login API to simulate session and authorization.
 * 3. Admin creates a new pharmacy integration (all required fields) using
 *    create API.
 * 4. Admin deletes the integration using erase API by id.
 * 5. Attempt to delete again with the same id and confirm it results in an
 *    error (integration no longer exists).
 *
 * NOTE: unable to validate non-listing/fetching after deletion due to API
 * limitations (no GET or list endpoint supplied), so only deletion
 * verification is possible.
 */
export async function test_api_delete_pharmacy_integration_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin signs up with random email
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Admin logs in (simulate separate login)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInAdmin);

  // 3. Create a pharmacy integration
  const createBody = {
    healthcare_platform_organization_id: admin.id, // admin id as org id
    pharmacy_vendor_code: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }),
    connection_uri: `https://pharmacy-${RandomGenerator.alphaNumeric(8)}.example.com/api`,
    supported_protocol: RandomGenerator.pick(["NCPDP", "FHIR", "HL7"] as const),
    status: "active",
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.create(
      connection,
      { body: createBody },
    );
  typia.assert(integration);

  // 4. Delete the integration
  await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.erase(
    connection,
    {
      pharmacyIntegrationId: integration.id,
    },
  );

  // 5. Attempt to delete again, should throw an error (integration already deleted)
  await TestValidator.error(
    "delete on non-existent pharmacy integration should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.erase(
        connection,
        {
          pharmacyIntegrationId: integration.id,
        },
      );
    },
  );
}
