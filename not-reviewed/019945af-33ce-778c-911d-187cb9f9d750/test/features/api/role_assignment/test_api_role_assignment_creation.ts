import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";

/**
 * This test validates the creation of role assignments linking users to
 * roles.
 *
 * The test first authenticates as an admin by joining via the
 * /auth/admin/join endpoint. Using the obtained authorization, it attempts
 * to create a role assignment with a valid user ID and allowed role name.
 * It asserts the correctness of the response, including ID, user_id,
 * role_name, and timestamps.
 *
 * The test also checks error handling by attempting to create role
 * assignments with invalid data such as missing role name or invalid user
 * ID, expecting errors.
 *
 * This ensures proper authorization, data validation, persistence, and
 * business logic enforcement for role assignments.
 */
export async function test_api_role_assignment_creation(
  connection: api.IConnection,
) {
  // 1. Join as admin to authenticate
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Prepare valid role assignment data
  const validUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validRoleName = RandomGenerator.pick([
    "Admin",
    "Editor",
    "Viewer",
  ] as const);

  const validRoleAssignmentCreateBody = {
    user_id: validUserId,
    role_name: validRoleName,
  } satisfies IFlexOfficeRoleAssignment.ICreate;

  // 2. Create a valid role assignment
  const roleAssignment: IFlexOfficeRoleAssignment =
    await api.functional.flexOffice.admin.roleAssignments.create(connection, {
      body: validRoleAssignmentCreateBody,
    });
  typia.assert(roleAssignment);

  TestValidator.equals(
    "roleAssignment user_id should match requested",
    roleAssignment.user_id,
    validUserId,
  );
  TestValidator.equals(
    "roleAssignment role_name should match requested",
    roleAssignment.role_name,
    validRoleName,
  );
  TestValidator.predicate(
    "roleAssignment id should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roleAssignment.id,
    ),
  );
  TestValidator.predicate(
    "roleAssignment created_at is ISO 8601",
    typeof roleAssignment.created_at === "string" &&
      roleAssignment.created_at.length > 0,
  );
  TestValidator.predicate(
    "roleAssignment updated_at is ISO 8601",
    typeof roleAssignment.updated_at === "string" &&
      roleAssignment.updated_at.length > 0,
  );

  // deleted_at should be null or undefined on new assignment
  TestValidator.predicate(
    "roleAssignment deleted_at is null or undefined",
    roleAssignment.deleted_at === null ||
      roleAssignment.deleted_at === undefined,
  );

  // 3. Test invalid role assignment creation - empty role_name
  await TestValidator.error(
    "creating role assignment without role_name should error",
    async () => {
      await api.functional.flexOffice.admin.roleAssignments.create(connection, {
        body: {
          user_id: validUserId,
          role_name: "",
        } satisfies IFlexOfficeRoleAssignment.ICreate,
      });
    },
  );

  // 4. Test invalid role assignment creation - invalid user_id
  await TestValidator.error(
    "creating role assignment with invalid user_id should error",
    async () => {
      await api.functional.flexOffice.admin.roleAssignments.create(connection, {
        body: {
          user_id: "invalid-uuid-format",
          role_name: validRoleName,
        } satisfies IFlexOfficeRoleAssignment.ICreate,
      });
    },
  );
}
