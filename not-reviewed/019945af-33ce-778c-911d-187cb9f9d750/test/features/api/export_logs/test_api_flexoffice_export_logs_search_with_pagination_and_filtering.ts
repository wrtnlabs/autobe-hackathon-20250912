import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExportLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeExportLog";

export async function test_api_flexoffice_export_logs_search_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin joins to create an authorized admin user
  const createAdminBody = {
    email: RandomGenerator.alphaNumeric(8) + "@company.com",
    password: "StrongP@ssword123",
  } satisfies IFlexOfficeAdmin.ICreate;

  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(createdAdmin);

  // 2. Admin logs in to obtain authentication token and context
  const loginBody = {
    email: createAdminBody.email,
    password: createAdminBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Use the authenticated context implicitly by SDK handling headers

  // 3. Prepare a valid search request for export logs filtered by executed_by_user_id,
  // with pagination settings
  const requestBody = {
    executed_by_user_id: createdAdmin.id,
    page: 1,
    limit: 10,
    // Optional filters can be null explicitly (no filtering on these)
    export_type: null,
    executed_at_from: null,
    executed_at_to: null,
    status: null,
  } satisfies IFlexOfficeExportLog.IRequest;

  const response: IPageIFlexOfficeExportLog.ISummary =
    await api.functional.flexOffice.admin.exportLogs.index(connection, {
      body: requestBody,
    });
  typia.assert(response);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should equal requested page",
    response.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should equal requested limit",
    response.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination pages should be >= 0",
    response.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records should be >= 0",
    response.pagination.records >= 0,
  );

  // 5. Validate that all export logs are executed by the requested user
  for (const log of response.data) {
    TestValidator.equals(
      "log executed_by_user_id matches filter",
      log.executed_by_user_id,
      createdAdmin.id,
    );
  }

  // 6. Test unauthorized access denial
  // Create a new connection with empty headers to simulate unauthorized
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempting to call exportLogs.index with unauthorized (no auth token)
  await TestValidator.error(
    "unauthenticated call to exportLogs.index should fail",
    async () => {
      await api.functional.flexOffice.admin.exportLogs.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 7. Test invalid filters - e.g., constructed with invalid UUID format
  // Emit no type error by using valid UUID but replaced with invalid for test
  // We choose not to send wrong types or incomplete properties according to rules

  const invalidRequestBody: IFlexOfficeExportLog.IRequest = {
    ...requestBody,
    executed_by_user_id: "00000000-0000-0000-0000-000000000000",
  };

  // Invalid user id should result in empty results or handled gracefully
  const invalidResponse =
    await api.functional.flexOffice.admin.exportLogs.index(connection, {
      body: invalidRequestBody,
    });
  typia.assert(invalidResponse);

  TestValidator.predicate(
    "invalid executed_by_user_id filter returns zero or no data",
    ArrayUtil.has(
      invalidResponse.data,
      (log) =>
        log.executed_by_user_id !== "00000000-0000-0000-0000-000000000000",
    ) === false,
  );
}
