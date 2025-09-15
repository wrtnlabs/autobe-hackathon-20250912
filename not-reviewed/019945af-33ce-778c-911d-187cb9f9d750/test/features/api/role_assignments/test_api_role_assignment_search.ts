import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeRoleAssignment";

/**
 * This E2E test validates the role assignment search API for admin users.
 *
 * The scenario covers:
 *
 * - Admin user creation and authentication.
 * - Searching role assignments with filters by user ID and role name.
 * - Validation of pagination information and correctness of returned data.
 * - Edge cases with empty filters and pagination boundaries.
 *
 * A complete business scenario emulating realistic admin permission search
 * operation.
 */
export async function test_api_role_assignment_search(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const authorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(authorized);

  // 2. Prepare for searching role assignments
  // We attempt filtering by a specific userId value from the response data if any

  // First, try calling without filters to get some data
  const searchAllResponse: IPageIFlexOfficeRoleAssignment.ISummary =
    await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          user_id: null,
          role_name: null,
        } satisfies IFlexOfficeRoleAssignment.IRequest,
      },
    );
  typia.assert(searchAllResponse);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is positive",
    searchAllResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchAllResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    searchAllResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records count consistent",
    searchAllResponse.pagination.records >= 0,
  );

  // 3. If data exists, filter by a specific user_id of the first record
  if (searchAllResponse.data.length > 0) {
    const firstUserId: string & tags.Format<"uuid"> =
      searchAllResponse.data[0].user_id;

    // Perform filtered search by user_id
    const filteredByUserIdResponse: IPageIFlexOfficeRoleAssignment.ISummary =
      await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
        connection,
        {
          body: {
            user_id: firstUserId,
            role_name: null,
            page: 1,
            limit: 10,
          } satisfies IFlexOfficeRoleAssignment.IRequest,
        },
      );
    typia.assert(filteredByUserIdResponse);

    // Validate all returned role assignments have matching user_id
    for (const item of filteredByUserIdResponse.data) {
      TestValidator.equals(
        "filtered role assignment user_id matches filter",
        item.user_id,
        firstUserId,
      );
    }

    // Validate pagination fields
    TestValidator.predicate(
      "filtered search pagination current page is 1",
      filteredByUserIdResponse.pagination.current === 1,
    );
    TestValidator.predicate(
      "filtered search pagination limit is 10",
      filteredByUserIdResponse.pagination.limit === 10,
    );
  }

  // 4. Perform filtered search by role_name if any entry exists
  if (searchAllResponse.data.length > 0) {
    const firstRoleName = searchAllResponse.data[0].role_name;

    const filteredByRoleNameResponse: IPageIFlexOfficeRoleAssignment.ISummary =
      await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
        connection,
        {
          body: {
            user_id: null,
            role_name: firstRoleName,
            page: 1,
            limit: 10,
          } satisfies IFlexOfficeRoleAssignment.IRequest,
        },
      );
    typia.assert(filteredByRoleNameResponse);

    // Validate all returned records have the filtered role_name
    for (const item of filteredByRoleNameResponse.data) {
      TestValidator.equals(
        "filtered role assignment role_name matches filter",
        item.role_name,
        firstRoleName,
      );
    }

    // Validate pagination fields
    TestValidator.predicate(
      "filtered role_name pagination current page is 1",
      filteredByRoleNameResponse.pagination.current === 1,
    );
    TestValidator.predicate(
      "filtered role_name pagination limit is 10",
      filteredByRoleNameResponse.pagination.limit === 10,
    );
  }

  // 5. Edge cases for empty filters (nulls) and pagination boundaries

  // Empty filters (should return all role assignments)
  const emptyFilterResponse: IPageIFlexOfficeRoleAssignment.ISummary =
    await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
      connection,
      {
        body: {
          user_id: null,
          role_name: null,
          page: 1,
          limit: 5,
        } satisfies IFlexOfficeRoleAssignment.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);

  // Validate pagination and data length
  TestValidator.predicate(
    "empty filter with limit 5 returns up to 5 items",
    emptyFilterResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "empty filter pagination current page is 1",
    emptyFilterResponse.pagination.current === 1,
  );

  // Test pagination with large page number (boundary test), expecting empty data or valid page
  const largePageResponse: IPageIFlexOfficeRoleAssignment.ISummary =
    await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
      connection,
      {
        body: {
          user_id: null,
          role_name: null,
          page: 9999,
          limit: 10,
        } satisfies IFlexOfficeRoleAssignment.IRequest,
      },
    );
  typia.assert(largePageResponse);
  TestValidator.predicate(
    "large page number pagination current page >= 1",
    largePageResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "large page number data array length >= 0",
    largePageResponse.data.length >= 0,
  );

  // Validate no unauthorized search is allowed (simulate unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "search roleAssignments without authentication fails",
    async () => {
      await api.functional.flexOffice.admin.roleAssignments.searchRoleAssignments(
        unauthConnection,
        {
          body: {
            user_id: null,
            role_name: null,
            page: 1,
            limit: 10,
          } satisfies IFlexOfficeRoleAssignment.IRequest,
        },
      );
    },
  );
}
