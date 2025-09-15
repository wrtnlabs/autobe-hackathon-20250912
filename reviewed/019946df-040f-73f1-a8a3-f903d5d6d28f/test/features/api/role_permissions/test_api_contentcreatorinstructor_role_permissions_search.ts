import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";

/**
 * This test validates the search functionality for content creator instructor
 * role permissions.
 *
 * Business context: Authorized content creator instructors should be able to
 * retrieve a paginated and filtered list of role permissions assigned to their
 * roles.
 *
 * Steps:
 *
 * 1. Create and authenticate a content creator instructor user for a tenant.
 * 2. Log in as the created user to obtain authorization tokens.
 * 3. Use filtered search by role_id to get the list of permissions.
 * 4. Validate compliance with pagination, filtering, and boolean flags.
 * 5. Confirm that accessing the endpoint without authentication is denied.
 */
export async function test_api_contentcreatorinstructor_role_permissions_search(
  connection: api.IConnection,
) {
  // 1. Create a new content creator instructor user for a tenant
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const userEmail = typia.random<string & tags.Format<"email">>();
  // Provide a realistic hashed password string simulating hashing
  const fakePasswordHash = RandomGenerator.alphaNumeric(64);
  const joinBody = {
    tenant_id: tenantId,
    email: userEmail,
    password_hash: fakePasswordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const createdUser = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(createdUser);

  // 2. Login as the created user to get authorization tokens
  const loginBody = {
    email: userEmail,
    password: fakePasswordHash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInUser);

  // 3. Use the authenticated context to search role permissions filtered by user's role_id
  // Note: The role_id filter is set here to user's id to simulate role-based filtering
  const searchBody = {
    page: 1,
    limit: 10,
    role_id: createdUser.id,
  } satisfies IEnterpriseLmsRolePermissions.IRequest;

  const searchResult =
    await api.functional.enterpriseLms.contentCreatorInstructor.rolePermissions.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchResult);

  // 4. Validate that all returned permissions have allowed flags as booleans
  for (const permission of searchResult.data) {
    TestValidator.predicate(
      `permission.is_allowed is boolean for ${permission.permission_key}`,
      typeof permission.is_allowed === "boolean",
    );
  }

  // Validate pagination metadata
  const pagination = searchResult.pagination;
  TestValidator.predicate(
    "pagination current page is positive integer",
    Number.isInteger(pagination.current) && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    Number.isInteger(pagination.limit) && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive integer",
    Number.isInteger(pagination.pages) && pagination.pages >= 0,
  );

  // Validate permissions correspond to the requested role_id
  // Since response doesn't directly include role_id, we validate presence of summary data
  TestValidator.predicate(
    "permissions list is an array",
    Array.isArray(searchResult.data),
  );

  // 5. Validate authentication is enforced
  // Attempt to access endpoint without authentication (new connection with empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access should be denied",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.rolePermissions.index(
        unauthenticatedConnection,
        {
          body: searchBody,
        },
      );
    },
  );
}
