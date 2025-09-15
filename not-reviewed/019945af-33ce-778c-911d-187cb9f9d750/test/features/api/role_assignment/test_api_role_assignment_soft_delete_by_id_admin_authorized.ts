import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeRoleAssignment";

export async function test_api_role_assignment_soft_delete_by_id_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Admin user sign up
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user login (optional if same connection with token too)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create a new role assignment for testing deletion
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const roleNames = ["Admin", "Editor", "Viewer", "User"] as const;
  const createBody = {
    user_id: targetUserId,
    role_name: RandomGenerator.pick(roleNames),
  } satisfies IFlexOfficeRoleAssignment.ICreate;
  const createdRoleAssignment: IFlexOfficeRoleAssignment =
    await api.functional.flexOffice.admin.roleAssignments.create(connection, {
      body: createBody,
    });
  typia.assert(createdRoleAssignment);

  // 4. Search the role assignments to confirm existence
  const searchBody = {
    user_id: targetUserId,
    role_name: createBody.role_name,
  } satisfies IFlexOfficeRoleAssignment.IRequest;
  const searchResult: IPageIFlexOfficeRoleAssignment.ISummary =
    await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "role assignment should exist in search results",
    searchResult.data.some((item) => item.id === createdRoleAssignment.id),
  );

  // 5. Soft delete the created role assignment by ID
  await api.functional.flexOffice.admin.roleAssignments.erase(connection, {
    id: createdRoleAssignment.id,
  });

  // Note: DELETE returns no content, success is confirmed by absence of errors

  // 6. Search again to confirm the role assignment is marked as deleted/not returned
  const searchAfterDelete: IPageIFlexOfficeRoleAssignment.ISummary =
    await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchAfterDelete);

  TestValidator.predicate(
    "deleted role assignment should not be found in search results",
    !searchAfterDelete.data.some(
      (item) => item.id === createdRoleAssignment.id,
    ),
  );
}
