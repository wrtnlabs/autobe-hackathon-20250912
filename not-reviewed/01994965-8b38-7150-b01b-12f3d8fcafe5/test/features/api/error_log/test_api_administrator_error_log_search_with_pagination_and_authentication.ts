import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderErrorLog";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderErrorLog";

export async function test_api_administrator_error_log_search_with_pagination_and_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator Sign-Up
  const passwordPlain = "Password123!";
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    // Using plaintext password as a hash simulation for test consistency
    password_hash: passwordPlain,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Administrator Login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: passwordPlain,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoggedIn: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Filtered Pagination Search for Error Logs
  const requestBody = {
    page: 1,
    limit: 10,
    filter_error_code: null,
    filter_resolved: null,
    search: null,
    order: "occurred_at desc",
  } satisfies ITelegramFileDownloaderErrorLog.IRequest;

  const pagedResult: IPageITelegramFileDownloaderErrorLog =
    await api.functional.telegramFileDownloader.administrator.errorLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pagedResult);

  // 4. Validate Pagination and Response Data
  TestValidator.predicate(
    "pagination page number equals requested",
    pagedResult.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "pagination record limit equals requested limit",
    pagedResult.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination pages is not negative",
    pagedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    pagedResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "all error logs have resolved field",
    pagedResult.data.every((item) => typeof item.resolved === "boolean"),
  );

  if (requestBody.filter_resolved !== null) {
    TestValidator.predicate(
      `all error logs have resolved === ${requestBody.filter_resolved}`,
      pagedResult.data.every(
        (item) => item.resolved === requestBody.filter_resolved,
      ),
    );
  }

  if (requestBody.filter_error_code !== null) {
    TestValidator.predicate(
      `all error logs have error_code === ${requestBody.filter_error_code}`,
      pagedResult.data.every(
        (item) => item.error_code === requestBody.filter_error_code,
      ),
    );
  }
}
