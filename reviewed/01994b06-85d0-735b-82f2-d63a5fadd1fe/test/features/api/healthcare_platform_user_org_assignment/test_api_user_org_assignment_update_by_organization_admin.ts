import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Test the update of a user-organization assignment by organization admin
 * including various edge cases.
 *
 * 1. Register Org Admin A
 * 2. Create a user-organization assignment via Org Admin A
 * 3. Successfully update assignment as Org Admin A (role/status change, confirm
 *    updated_at moves forward and values change)
 * 4. Attempt to update with a non-existent assignment ID (should throw error)
 * 5. Register Org Admin B (different organization)
 * 6. Attempt to update assignment as Org Admin B (should throw error: not
 *    permitted)
 */
export async function test_api_user_org_assignment_update_by_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Register Org Admin A
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminA);

  // Step 2: Create assignment as Org Admin A
  const assignmentCreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    role_code: "staff",
    assignment_status: "active",
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: assignmentCreate,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "created user_id matches",
    assignment.user_id,
    assignmentCreate.user_id,
  );
  TestValidator.equals(
    "created org_id matches",
    assignment.healthcare_platform_organization_id,
    assignmentCreate.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "created role_code matches",
    assignment.role_code,
    assignmentCreate.role_code,
  );
  TestValidator.equals(
    "created status matches",
    assignment.assignment_status,
    assignmentCreate.assignment_status,
  );

  // Step 3: Update assignment - change role and status, verify updated_at and values
  const updateBody = {
    role_code: "lead",
    assignment_status: "suspended",
  } satisfies IHealthcarePlatformUserOrgAssignment.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.update(
      connection,
      {
        userOrgAssignmentId: assignment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "assignment id stays same on update",
    updated.id,
    assignment.id,
  );
  TestValidator.equals(
    "role_code is updated",
    updated.role_code,
    updateBody.role_code,
  );
  TestValidator.equals(
    "assignment_status is updated",
    updated.assignment_status,
    updateBody.assignment_status,
  );
  TestValidator.notEquals(
    "updated_at has changed",
    updated.updated_at,
    assignment.updated_at,
  );

  // Step 4: Attempt update with non-existent ID
  await TestValidator.error(
    "updating with invalid assignment id should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.update(
        connection,
        {
          userOrgAssignmentId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // Step 5: Register Org Admin B (different organization)
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminB);

  // Step 6: Try update as Org Admin B (should be not permitted for assignment in Org Admin A's org)
  await TestValidator.error(
    "org admin B cannot update assignment outside of their org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.update(
        connection,
        {
          userOrgAssignmentId: assignment.id,
          body: {
            role_code: "hacker",
          } satisfies IHealthcarePlatformUserOrgAssignment.IUpdate,
        },
      );
    },
  );
}
