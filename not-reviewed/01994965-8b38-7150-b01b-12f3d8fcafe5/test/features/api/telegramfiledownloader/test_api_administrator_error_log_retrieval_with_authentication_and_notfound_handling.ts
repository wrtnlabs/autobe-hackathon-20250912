import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderErrorLog";

/**
 * End-to-end test for administrator error log retrieval with authentication
 * and not-found handling.
 *
 * This test verifies the complete workflow for administrator interaction
 * with the error log retrieval API.
 *
 * It includes:
 *
 * 1. Administrator account creation via /auth/administrator/join
 * 2. Administrator authentication via /auth/administrator/login
 * 3. Error log record retrieval by valid UUID ID via GET
 *    /telegramFileDownloader/administrator/errorLogs/{id}
 * 4. Validation of authorization and error handling for non-existent error log
 *    IDs
 *
 * The test asserts successful creation and login of administrator account,
 * correct retrieval of error log details, and correct error response for
 * invalid/non-existent IDs.
 *
 * Authentication tokens are managed automatically by the SDK.
 */
export async function test_api_administrator_error_log_retrieval_with_authentication_and_notfound_handling(
  connection: api.IConnection,
) {
  // 1. Administrator account creation
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const passwordHash: string = `${adminPassword}`; // Normally, this should be a hash; using plain here as string for test

  const createdAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Administrator login for authentication
  const loggedInAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Fetch an error log record by ID, use a valid existing ID from simulation
  const validErrorLog =
    api.functional.telegramFileDownloader.administrator.errorLogs.at.random();
  typia.assert(validErrorLog);

  const fetchedLog: ITelegramFileDownloaderErrorLog =
    await api.functional.telegramFileDownloader.administrator.errorLogs.at(
      connection,
      {
        id: validErrorLog.id,
      },
    );
  typia.assert(fetchedLog);

  // 4. Test fetching a non-existent log to trigger 404 error
  await TestValidator.error(
    "fetch error log with non-existent id should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.errorLogs.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
