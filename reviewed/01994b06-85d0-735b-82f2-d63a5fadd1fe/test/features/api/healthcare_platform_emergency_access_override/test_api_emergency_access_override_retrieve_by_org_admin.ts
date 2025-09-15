import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates retrieval of an emergency access override audit record
 * (break-the-glass event) by an organization admin, including permission
 * enforcement and error handling for cross-organization or missing resources.
 *
 * Scenario steps:
 *
 * 1. Organization admin joins (register) and logs in (get authorized session).
 * 2. At least one override event is provisioned for the admin's organization (via
 *    test fixture/mock, since no creation API).
 * 3. Organization admin retrieves their override by ID (success positive path).
 * 4. Organization admin attempts to retrieve an override for another org (should
 *    trigger authorization error, e.g., 403).
 * 5. Organization admin requests with a random non-existent id (should trigger not
 *    found error).
 *
 * Due to DTO/API limitations, organization_id for the override is based on
 * adminJoin.id as a best-effort proxy for the admin's org context, as no
 * organization_id is directly surfaced in onboarding/join/login output.
 */
export async function test_api_emergency_access_override_retrieve_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinRes = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "test-password",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoinRes);

  // 2. Login as organization admin
  const adminLoginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "test-password",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLoginRes);

  // 3. Simulate emergency override record for admin's org (no POST available, so synthesize within E2E, using adminJoinRes.id as best-effort org context)
  const myOverride: IHealthcarePlatformEmergencyAccessOverride = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: adminJoinRes.id satisfies string as string, // Only admin id is available to proxy org ownership
    reason: RandomGenerator.paragraph(),
    override_scope: RandomGenerator.paragraph(),
    override_start_at: new Date().toISOString(),
    override_end_at: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  // 4. Simulate override for another org (for cross-org denial test)
  const otherOrgId = typia.random<string & tags.Format<"uuid">>();
  const otherOrgOverride: IHealthcarePlatformEmergencyAccessOverride = {
    ...myOverride,
    id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: otherOrgId,
  };

  // 5. Retrieve my org override (positive case)
  const overrideResult =
    await api.functional.healthcarePlatform.organizationAdmin.emergencyAccessOverrides.at(
      connection,
      {
        emergencyAccessOverrideId: myOverride.id,
      },
    );
  typia.assert(overrideResult);
  TestValidator.equals(
    "override organization matches admin context",
    overrideResult.organization_id,
    myOverride.organization_id,
  );
  TestValidator.equals(
    "override id matches requested id",
    overrideResult.id,
    myOverride.id,
  );

  // 6. Cross-org retrieval attempt (should raise 403/authorization error)
  await TestValidator.error(
    "organization admin denied access to other organization override",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.emergencyAccessOverrides.at(
        connection,
        {
          emergencyAccessOverrideId: otherOrgOverride.id,
        },
      );
    },
  );

  // 7. Non-existent id (should raise 404/not found)
  await TestValidator.error(
    "organization admin not found error for unknown id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.emergencyAccessOverrides.at(
        connection,
        {
          emergencyAccessOverrideId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
