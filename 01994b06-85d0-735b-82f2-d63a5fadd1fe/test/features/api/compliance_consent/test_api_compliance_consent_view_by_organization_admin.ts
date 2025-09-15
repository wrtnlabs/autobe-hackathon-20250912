import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for organization admin viewing a compliance consent record.
 *
 * 1. Register a new organization admin via join API and confirm type.
 * 2. Login as that admin to re-establish authentication and capture headers.
 * 3. Simulate or retrieve a compliance consent belonging to this admin's
 *    organization (using random and/or emulated values per typia.random).
 *    The test assumes at least one consent exists for valid retrieval.
 * 4. Use the admin credentials to call the compliance consent view endpoint
 *    (GET by ID) and confirm a correct, fully-formed result. Validate that
 *    the consent's organization_id matches the admin's organization.
 * 5. Attempt to fetch a compliance consent using a random UUID or a consent
 *    from another organization to confirm an error occurs (and RBAC is
 *    enforced). Validate correct error via TestValidator.error (no type
 *    violations).
 */
export async function test_api_compliance_consent_view_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "SecurePW123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoinResult);

  // 2. Login as admin (simulates context switch)
  const adminLoginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "SecurePW123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);

  // 3. Simulate a compliance consent that belongs to this admin's organization
  const orgId = adminLoginResult.id;
  const consent: IHealthcarePlatformComplianceConsent = {
    ...typia.random<IHealthcarePlatformComplianceConsent>(),
    organization_id: orgId,
  };
  typia.assert(consent);

  // 4. Fetch the consent by ID (simulate presence)
  const output =
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.at(
      connection,
      {
        complianceConsentId: consent.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "organization_id matches",
    output.organization_id,
    orgId,
  );

  // 5. Negative test: fetch with a random/fake UUID (simulate not-owned or non-existent)
  await TestValidator.error(
    "errors when fetching non-existent/foreign consentId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.at(
        connection,
        {
          complianceConsentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
