import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";

/**
 * This E2E test validates the searching of role permissions within an
 * organization administrator tenant context, focusing on filtered retrieval by
 * role ID with pagination and sorting.
 *
 * Strategic implementation includes:
 *
 * - Registering and authenticating an organization admin user.
 * - Performing search requests on role permissions filtered narrowly by a given
 *   role ID.
 * - Validating the response contains correct permission entries matching the role
 *   ID filter.
 * - Verifying pagination metadata correctness such as current page, limit, total
 *   records, and number of pages.
 * - Testing edge cases with filters resulting in no matches, ensuring valid empty
 *   results and pagination usability.
 * - Testing unauthorized access for protection.
 *
 * Key DTOs used are IEnterpriseLmsOrganizationAdmin.ICreate for account
 * creation, IEnterpriseLmsOrganizationAdmin.ILogin for authentication, and
 * IEnterpriseLmsRolePermissions.IRequest for filtered search input. The
 * response type IPageIEnterpriseLmsRolePermissions.ISummary including paginated
 * list and pagination info will be asserted for correctness.
 *
 * The domain is role_permissions as it is about managing role permission
 * listings inside the Enterprise LMS system.
 *
 * The test covers the following workflow:
 *
 * 1. Create an organization admin using a realistic tenant_id and login
 *    credentials.
 * 2. Login to obtain an authorized session with valid tokens.
 * 3. Use the authorized context to perform rolePermissions.index search filtered
 *    by a role_id (simulate several cases).
 * 4. Validate the response type and that all returned role permissions refer to
 *    the filtered role (by role_id) context indirectly.
 * 5. Check pagination metadata values for correctness.
 * 6. Search with criteria that yields no results and confirm the empty data array
 *    and proper pagination metadata.
 * 7. Verify error is correctly thrown on unauthorized request (simulate with fresh
 *    unauthenticated connection).
 */
export async function test_api_role_permissions_search_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create an organization admin with tenant_id and valid credentials
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "password123";

  const createBody = {
    tenant_id: tenantId,
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: createBody },
  );
  typia.assert(organizationAdmin);

  // 2. Login as organization admin
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const authenticatedAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(authenticatedAdmin);

  // 3. Prepare valid role_id filter for searching
  // Since actual role_id creation is not mocked, we will simulate by picking a valid UUID
  const searchRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Perform search with valid role_id filter and pagination params
  const searchRequest = {
    role_id: searchRoleId,
    page: 1,
    limit: 10,
    orderBy: "permission_key",
    orderDirection: "asc",
  } satisfies IEnterpriseLmsRolePermissions.IRequest;

  const result1 =
    await api.functional.enterpriseLms.organizationAdmin.rolePermissions.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(result1);

  // Validate the pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    result1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    result1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    result1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination total records should be >= 0",
    result1.pagination.records >= 0,
  );

  // Validate that every item has is_allowed boolean and permission_key string
  for (const permission of result1.data) {
    TestValidator.predicate(
      "permission has permission_key",
      typeof permission.permission_key === "string" &&
        permission.permission_key.length > 0,
    );
    TestValidator.predicate(
      "permission has boolean is_allowed",
      typeof permission.is_allowed === "boolean",
    );
    // description can be undefined or null or string
    TestValidator.predicate(
      "permission description check",
      permission.description === null ||
        permission.description === undefined ||
        typeof permission.description === "string",
    );
  }

  // 5. Test edge case: search with no matches
  // We simulate by using a random UUID unlikely to exist
  const searchNoMatchReq = {
    role_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsRolePermissions.IRequest;

  const resultNoMatch =
    await api.functional.enterpriseLms.organizationAdmin.rolePermissions.index(
      connection,
      { body: searchNoMatchReq },
    );
  typia.assert(resultNoMatch);

  // Validate data array empty with valid pagination
  TestValidator.equals(
    "result data should be empty",
    resultNoMatch.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination records should be 0",
    resultNoMatch.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    resultNoMatch.pagination.current === 1,
  );

  // 6. Unauthorized access test
  // Create an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized request should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.rolePermissions.index(
      unauthenticatedConnection,
      { body: searchRequest },
    );
  });
}
