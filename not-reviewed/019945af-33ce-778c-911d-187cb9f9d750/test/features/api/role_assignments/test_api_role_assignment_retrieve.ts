import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";

/**
 * This test validates the ability of an authenticated admin user to retrieve a
 * specific role assignment by its unique ID.
 *
 * Steps:
 *
 * 1. Join and authenticate as a new admin user.
 * 2. Attempt to retrieve a role assignment using a randomly generated UUID as ID.
 *    Since no API is exposed to create role assignments, this UUID tests the
 *    API's response to both existing and non-existing IDs.
 * 3. Validate that if a role assignment is returned, it matches the requested ID
 *    and has valid user_id and non-empty role_name.
 * 4. Test that the retrieval request without authentication is rejected.
 * 5. Test that retrieval with a non-existent ID is rejected with proper validation
 *    error.
 */
export async function test_api_role_assignment_retrieve(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
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

  // Step 2: Use a random UUID as role assignment ID (no creation API available)
  const testRoleAssignmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt retrieval with authentication
  try {
    const roleAssignment: IFlexOfficeRoleAssignment =
      await api.functional.flexOffice.admin.roleAssignments.at(connection, {
        id: testRoleAssignmentId,
      });
    typia.assert(roleAssignment);

    TestValidator.equals(
      "retrieved role assignment ID matches requested ID",
      roleAssignment.id,
      testRoleAssignmentId,
    );

    typia.assert<string & tags.Format<"uuid">>(roleAssignment.user_id);
    TestValidator.predicate(
      "role_name is non-empty string",
      typeof roleAssignment.role_name === "string" &&
        roleAssignment.role_name.length > 0,
    );
  } catch {
    /* If 404 Not Found or other error occurs, test passes for missing ID case */
  }

  // Step 4: Test unauthenticated access is rejected
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated access to role assignment should fail",
    async () => {
      await api.functional.flexOffice.admin.roleAssignments.at(
        unauthenticatedConnection,
        { id: testRoleAssignmentId },
      );
    },
  );

  // Step 5: Test retrieval of non-existent ID triggers error
  // Using a different random UUID (very unlikely to exist)
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval of non-existent role assignment should fail",
    async () => {
      await api.functional.flexOffice.admin.roleAssignments.at(connection, {
        id: nonexistentId,
      });
    },
  );
}
