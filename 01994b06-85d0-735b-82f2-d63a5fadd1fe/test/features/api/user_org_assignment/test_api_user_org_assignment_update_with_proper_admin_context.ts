import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validate that a system administrator can update a user-organization
 * assignment record as allowed, and that business rules and error scenarios are
 * handled correctly.
 *
 * Steps:
 *
 * 1. Create and authenticate as a system admin with update privileges
 * 2. Create a user-organization assignment for update
 * 3. Update assignment mutable fields as the system admin
 * 4. Confirm the record is updated and the returned assignment matches
 *    expectations
 * 5. Attempt update with invalid role_code/assignment_status to trigger validation
 *    error
 * 6. Attempt update with a non-existent userOrgAssignmentId (should get not found
 *    error)
 * 7. (Simulated) Confirm that update without sufficient admin privileges would be
 *    forbidden
 *
 * All results are validated through runtime assertion; no type-level or type
 * error tests are included.
 */
export async function test_api_user_org_assignment_update_with_proper_admin_context(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: "StrongPassword!1",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a user-organization assignment to update
  const orgAssignmentCreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    role_code: "staff",
    assignment_status: "active",
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      { body: orgAssignmentCreate },
    );
  typia.assert(assignment);

  // 3. Update assignment mutable fields as admin
  const updateBody = {
    role_code: "manager",
    assignment_status: "suspended",
  } satisfies IHealthcarePlatformUserOrgAssignment.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.update(
      connection,
      {
        userOrgAssignmentId: assignment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated role_code",
    updated.role_code,
    updateBody.role_code,
  );
  TestValidator.equals(
    "updated assignment_status",
    updated.assignment_status,
    updateBody.assignment_status,
  );
  TestValidator.equals("assignment id unchanged", updated.id, assignment.id);

  // 4. Attempt update with invalid role_code (should fail validation)
  await TestValidator.error(
    "invalid role_code triggers validation error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.update(
        connection,
        {
          userOrgAssignmentId: assignment.id,
          body: { role_code: "_INVALID_ROLE_CODE_" },
        },
      );
    },
  );

  // 5. Attempt update with invalid assignment_status (should fail validation)
  await TestValidator.error(
    "invalid assignment_status triggers validation error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.update(
        connection,
        {
          userOrgAssignmentId: assignment.id,
          body: { assignment_status: "nonexistent_status" },
        },
      );
    },
  );

  // 6. Attempt update with non-existent assignment id (should get not found)
  await TestValidator.error(
    "non-existent assignment id triggers not found error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.update(
        connection,
        {
          userOrgAssignmentId: typia.random<string & tags.Format<"uuid">>(),
          body: { role_code: "staff" },
        },
      );
    },
  );

  // 7. (Simulated) Attempt update as insufficient privilege (re-auth is not supported for another admin, so simulate as unauth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("no auth triggers forbidden", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.update(
      unauthConn,
      {
        userOrgAssignmentId: assignment.id,
        body: { role_code: "staff" },
      },
    );
  });
}
