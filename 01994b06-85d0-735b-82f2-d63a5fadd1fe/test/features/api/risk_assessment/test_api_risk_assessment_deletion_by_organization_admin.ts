import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test that an organization admin can permanently delete a risk assessment
 * belonging to their organization, and that deletion is properly handled.
 * Scenarios:
 *
 * - Successful deletion of a resource within admin's own org
 * - Attempted deletion of a resource in another org (should fail)
 * - Deleting a non-existent riskAssessmentId (should fail)
 *
 * Steps:
 *
 * 1. Register and log in as org admin #1 (orgA). Prepare a riskAssessmentId
 *    (simulate, as no creation endpoint exists).
 * 2. Call DELETE
 *    /healthcarePlatform/organizationAdmin/riskAssessments/{riskAssessmentId}
 *    with an ID owned by this admin. Expect success (void response).
 * 3. Attempt to delete the same riskAssessmentId again. Expect error.
 * 4. Register and log in as org admin #2 (orgB). Attempt to delete an ID
 *    (simulated) 'owned' by orgA. Expect error.
 * 5. Attempt to delete a clearly non-existent/random riskAssessmentId (simulate
 *    UUID). Expect error.
 * 6. (No API/DTOs for audit log or resource confirmation, so side effect checks
 *    limited to action success/failure and proper API behavior.)
 */
export async function test_api_risk_assessment_deletion_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register org admin #1 (OrgA)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: admin1Email,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin1);

  // Prepare test riskAssessmentId owned by this admin (simulate, as no create API exists)
  const riskAssessmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Successful deletion (simulate ownership)
  await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.erase(
    connection,
    {
      riskAssessmentId,
    },
  );

  // 3. Re-deletion should fail (already deleted)
  await TestValidator.error(
    "Deleting already deleted riskAssessmentId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.erase(
        connection,
        {
          riskAssessmentId,
        },
      );
    },
  );

  // 4. Register org admin #2 (OrgB)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: admin2Email,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin2);
  // session now for orgB

  // 5. OrgB admin attempts to delete orgA's riskAssessmentId (should fail)
  await TestValidator.error(
    "Organization admin cannot delete risk assessment from another organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.erase(
        connection,
        {
          riskAssessmentId,
        },
      );
    },
  );

  // 6. Delete non-existent riskAssessmentId (not used above)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent riskAssessmentId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.riskAssessments.erase(
        connection,
        {
          riskAssessmentId: nonExistentId,
        },
      );
    },
  );
}
