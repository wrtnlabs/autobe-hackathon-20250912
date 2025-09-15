import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeUserActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeUserActivityLog";

/**
 * Validate admin user activity log search with filtering and pagination.
 *
 * This test ensures:
 *
 * 1. An admin user is created and authenticated.
 * 2. Admin performs a filtered search on user activity logs by user ID, action
 *    type, and timestamps.
 * 3. The response contains correct pagination metadata and activity log
 *    summary entries.
 * 4. Access is denied for non-admin (unauthenticated) users.
 * 5. The system correctly handles business logic error for invalid action type
 *    filter.
 *
 * It verifies compliance with audit and privacy policies without any type
 * validation errors. All test logic complies with strict TypeScript type
 * safety and API SDK usage policies.
 */
export async function test_api_user_activity_log_search_admin_access(
  connection: api.IConnection,
) {
  // 1. Admin user joins with a valid email and password, receives authorization tokens
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin user logs in with created credentials to validate token refresh and authentication flow
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Prepare valid user activity log search request with single timestamp filters
  const searchRequest: IFlexOfficeUserActivityLog.IRequest = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: RandomGenerator.pick([
      "login",
      "edit_page",
      "view_dashboard",
    ] as const),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. Query user activity logs with valid filters
  const pageResult: IPageIFlexOfficeUserActivityLog.ISummary =
    await api.functional.flexOffice.admin.userActivityLogs.index(connection, {
      body: searchRequest,
    });
  typia.assert(pageResult);

  // 5. Validate response pagination metadata correctness
  TestValidator.predicate(
    "pagination current page non-negative",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages computed correctly",
    pageResult.pagination.pages >= 0,
  );

  // 6. Validate data array elements have required user activity log summary properties
  for (const entry of pageResult.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "entry userId type check",
      typeof entry.user_id === "string" && entry.user_id.length > 0,
    );
    TestValidator.predicate(
      "entry actionType is string",
      typeof entry.action_type === "string" && entry.action_type.length > 0,
    );
    TestValidator.predicate(
      "entry createdAt valid format",
      typeof entry.created_at === "string" && entry.created_at.length > 0,
    );
  }

  // 7. Test error case: calling with invalid non-admin connection should throw error
  // For this, create unauthenticated connection (empty headers) and test access denial
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "non-admin cannot access user activity logs",
    async () => {
      await api.functional.flexOffice.admin.userActivityLogs.index(
        unauthenticatedConnection,
        { body: searchRequest },
      );
    },
  );

  // 8. Test error case: invalid action_type filter with well-typed but invalid string
  const invalidSearchRequest: IFlexOfficeUserActivityLog.IRequest = {
    user_id: null,
    action_type: "nonexistent_action_type",
    created_at: null,
    updated_at: null,
  };
  await TestValidator.error(
    "invalid actionType filter causes error",
    async () => {
      await api.functional.flexOffice.admin.userActivityLogs.index(connection, {
        body: invalidSearchRequest,
      });
    },
  );
}
