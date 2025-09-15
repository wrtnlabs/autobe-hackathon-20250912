import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

export async function test_api_user_org_assignment_deletion_by_system_admin(
  connection: api.IConnection,
) {
  /**
   * Test soft deletion of a user-organization assignment by a system
   * administrator.
   *
   * Steps:
   *
   * 1. Register and log in as a system admin (using local provider, random
   *    credentials)
   * 2. Create a user-org assignment (random related IDs and role)
   * 3. Delete (soft delete) the assignment as the system admin
   * 4. Attempt to delete the same assignment again, which must fail
   *
   * Business context:
   *
   * - Deletion is expected to mark the assignment deleted, preventing its future
   *   use
   * - Audit log entry for deletion is expected but not directly testable
   * - Error handling covers re-deletion of already deleted assignment
   * - Only system admin operations are available per given SDK
   */
  // 1. Register and login as system admin
  const sysAdminIn = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(16),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminIn,
  });
  typia.assert(sysAdmin);

  // 2. Create user-org assignment
  const assignmentIn = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    role_code: RandomGenerator.alphabets(8),
    assignment_status: "active",
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      { body: assignmentIn },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "user_id matches input",
    assignment.user_id,
    assignmentIn.user_id,
  );
  TestValidator.equals(
    "organization_id matches input",
    assignment.healthcare_platform_organization_id,
    assignmentIn.healthcare_platform_organization_id,
  );

  // 3. Delete (soft delete) assignment as system admin
  await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.erase(
    connection,
    { userOrgAssignmentId: assignment.id },
  );

  // 4. Attempt deleting the same assignment again should result in error
  await TestValidator.error(
    "deleting already-deleted assignment returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.erase(
        connection,
        { userOrgAssignmentId: assignment.id },
      );
    },
  );
}
