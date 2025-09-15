import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSourceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSourceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceLog";

/**
 * This test function validates the FlexOffice admin data source log search API.
 * It creates a new admin with random credentials, logs in to obtain
 * authentication tokens, and then performs various search queries on data
 * source logs to verify filtering, pagination, and response structure. It
 * ensures that only authenticated admins can use this API and that the filters
 * work as expected with correct pagination info.
 */
export async function test_api_data_source_log_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const email = `${RandomGenerator.alphaNumeric(6)}@test.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const createAdminBody = {
    email,
    password,
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(admin);

  // Step 2: Login as the created admin
  const loginBody = { email, password } satisfies IFlexOfficeAdmin.ILogin;
  const authorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Step 3: Define a few search filter variations

  function makeRequest(
    overrides: Partial<IFlexOfficeDataSourceLog.IRequest>,
  ): IFlexOfficeDataSourceLog.IRequest {
    return {
      page: 1,
      limit: 10,
      ...overrides,
    } satisfies IFlexOfficeDataSourceLog.IRequest;
  }

  // Empty filter - pagination defaults
  const emptyFilter = makeRequest({});
  const emptyResult: IPageIFlexOfficeDataSourceLog.ISummary =
    await api.functional.flexOffice.admin.dataSourceLogs.search(connection, {
      body: emptyFilter,
    });
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty filter returns pagination info",
    emptyResult.pagination.current > 0 && emptyResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "empty filter returns data array",
    Array.isArray(emptyResult.data),
  );

  // Filter by flex_office_data_source_id
  const sampleDataSourceId = typia.random<string & tags.Format<"uuid">>();
  const dataSourceIdFilter = makeRequest({
    flex_office_data_source_id: sampleDataSourceId,
  });
  const dataSourceIdResult: IPageIFlexOfficeDataSourceLog.ISummary =
    await api.functional.flexOffice.admin.dataSourceLogs.search(connection, {
      body: dataSourceIdFilter,
    });
  typia.assert(dataSourceIdResult);

  // Filter by log_level
  const logLevelSample = "info";
  const logLevelFilter = makeRequest({ log_level: logLevelSample });
  const logLevelResult: IPageIFlexOfficeDataSourceLog.ISummary =
    await api.functional.flexOffice.admin.dataSourceLogs.search(connection, {
      body: logLevelFilter,
    });
  typia.assert(logLevelResult);

  // Filter by message substring
  const messageSample = "error";
  const messageFilter = makeRequest({ message: messageSample });
  const messageResult: IPageIFlexOfficeDataSourceLog.ISummary =
    await api.functional.flexOffice.admin.dataSourceLogs.search(connection, {
      body: messageFilter,
    });
  typia.assert(messageResult);

  // Filter by user_id
  const userIdSample = typia.random<string & tags.Format<"uuid">>();
  const userIdFilter = makeRequest({ user_id: userIdSample });
  const userIdResult: IPageIFlexOfficeDataSourceLog.ISummary =
    await api.functional.flexOffice.admin.dataSourceLogs.search(connection, {
      body: userIdFilter,
    });
  typia.assert(userIdResult);

  // Filter by timestamp range
  const timestampFrom = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const timestampTo = new Date().toISOString();
  const timestampFilter = makeRequest({
    timestamp_from: timestampFrom,
    timestamp_to: timestampTo,
  });
  const timestampResult: IPageIFlexOfficeDataSourceLog.ISummary =
    await api.functional.flexOffice.admin.dataSourceLogs.search(connection, {
      body: timestampFilter,
    });
  typia.assert(timestampResult);

  // Verify pagination info exists and is reasonable
  for (const result of [
    emptyResult,
    dataSourceIdResult,
    logLevelResult,
    messageResult,
    userIdResult,
    timestampResult,
  ]) {
    TestValidator.predicate(
      "pagination current positive",
      typeof result.pagination.current === "number" &&
        result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      typeof result.pagination.limit === "number" &&
        result.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      typeof result.pagination.records === "number" &&
        result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages calculated",
      typeof result.pagination.pages === "number" &&
        result.pagination.pages >= 0,
    );
    TestValidator.predicate("data array", Array.isArray(result.data));

    // Each item in data array must contain required properties
    for (const log of result.data) {
      typia.assert(log);
      TestValidator.predicate(
        "log has id",
        typeof log.id === "string" && log.id.length > 0,
      );
      TestValidator.predicate(
        "log has log_level",
        typeof log.log_level === "string" && log.log_level.length > 0,
      );
      TestValidator.predicate(
        "log has timestamp",
        typeof log.timestamp === "string" && log.timestamp.length > 0,
      );
      TestValidator.predicate(
        "log has message",
        typeof log.message === "string",
      );
      TestValidator.predicate(
        "log has created_at",
        typeof log.created_at === "string" && log.created_at.length > 0,
      );
      TestValidator.predicate(
        "log has updated_at",
        typeof log.updated_at === "string" && log.updated_at.length > 0,
      );
    }
  }
}
