import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";

/**
 * This test verifies that authorized admin users can successfully update
 * existing role assignments. It authenticates as a new admin, prepares an
 * update payload with random but valid user and role details, performs the
 * update operation, and validates that the returned role assignment matches
 * while confirming the role assignment fields conform to allowed values.
 */
export async function test_api_role_assignment_update(
  connection: api.IConnection,
) {
  // 1. Admin sign up and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare role assignment update payload
  const roleAssignmentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    role_name: RandomGenerator.pick(["Admin", "Editor", "Viewer"] as const),
  } satisfies IFlexOfficeRoleAssignment.IUpdate;

  // 3. Call update endpoint
  const updatedAssignment: IFlexOfficeRoleAssignment =
    await api.functional.flexOffice.admin.roleAssignments.update(connection, {
      id: roleAssignmentId,
      body: updateBody,
    });
  typia.assert(updatedAssignment);

  // 4. Validate returned data
  TestValidator.equals(
    "role assignment id should match",
    updatedAssignment.id,
    roleAssignmentId,
  );

  TestValidator.equals(
    "user id should match updated",
    updatedAssignment.user_id,
    updateBody.user_id ?? updatedAssignment.user_id,
  );

  TestValidator.predicate(
    "role name should be one of allowed roles",
    ["Admin", "Editor", "Viewer"].includes(updatedAssignment.role_name),
  );
}
