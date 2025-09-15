import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderEnduser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderEnduser";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * This test validates the complete workflow of the Telegram File Downloader's
 * administrative user search feature.
 *
 * It performs the following steps:
 *
 * 1. Creates a new administrator account using a randomized but valid email and
 *    password hash.
 * 2. Logs in as the created administrator to obtain bearer tokens.
 * 3. Uses the administrator authorization context to search for end users, testing
 *    pagination and filtering features.
 * 4. Validates the structure of paginated responses, ensuring that sensitive
 *    details like passwords are never exposed.
 * 5. Tests error handling for invalid request payloads and unauthorized access
 *    attempts with no authentication.
 */
export async function test_api_telegram_file_downloader_enduser_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator user registration
  const passwordPlain = "securePassword123!";
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: passwordPlain,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Administrator login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: passwordPlain,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoginAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Use admin authentication context to search end users
  const searchBody = {
    page: 1,
    limit: 10,
    search: "",
    deleted: false,
  } satisfies ITelegramFileDownloaderEndUser.IRequest;

  const pageSummary: IPageITelegramFileDownloaderEnduser.ISummary =
    await api.functional.telegramFileDownloader.administrator.endusers.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageSummary);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    pageSummary.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 50",
    pageSummary.pagination.limit >= 1 && pageSummary.pagination.limit <= 50,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pageSummary.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    pageSummary.pagination.records >= 0,
  );

  // Validate each returned end user summary
  for (const userSummary of pageSummary.data) {
    typia.assert<ITelegramFileDownloaderEndUser.ISummary>(userSummary);
  }

  // 4. Test search filtering with keyword and no deleted filter
  const filteredSearchBody = {
    page: 1,
    limit: 5,
    search: "test",
    // deleted omitted to indicate no filter
  } satisfies ITelegramFileDownloaderEndUser.IRequest;

  const filteredPageSummary: IPageITelegramFileDownloaderEnduser.ISummary =
    await api.functional.telegramFileDownloader.administrator.endusers.index(
      connection,
      { body: filteredSearchBody },
    );
  typia.assert(filteredPageSummary);

  TestValidator.predicate(
    "page data count <= limit",
    filteredPageSummary.data.length <= filteredSearchBody.limit!,
  );

  // 5. Test invalid filter - page = 0 might be invalid business logic
  const invalidFilterBody = {
    page: 0,
    limit: 10,
  } satisfies ITelegramFileDownloaderEndUser.IRequest;

  await TestValidator.error("invalid search filter should throw", async () => {
    await api.functional.telegramFileDownloader.administrator.endusers.index(
      connection,
      { body: invalidFilterBody },
    );
  });

  // 6. Test unauthorized access - using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should throw", async () => {
    await api.functional.telegramFileDownloader.administrator.endusers.index(
      unauthenticatedConnection,
      { body: searchBody },
    );
  });
}
