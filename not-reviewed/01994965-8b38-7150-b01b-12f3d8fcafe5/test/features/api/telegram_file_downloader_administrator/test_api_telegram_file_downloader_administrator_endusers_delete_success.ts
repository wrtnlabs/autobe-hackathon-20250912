import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * Validates the successful deletion of a Telegram File Downloader end user
 * by an administrator.
 *
 * The test executes the complete flow ensuring that only authenticated
 * administrators can delete end users, and after deletion, the user is no
 * longer retrievable. It also verifies that unauthorized deletion attempts
 * are properly denied.
 *
 * Test steps:
 *
 * 1. Administrator joins (authenticates) to receive authorization tokens.
 * 2. Create a new end user to be deleted.
 * 3. Delete the created end user by its unique enduserId via administrator
 *    delete endpoint.
 * 4. Attempt to retrieve the deleted end user to ensure it results in an error
 *    (404 not found). Since the scenario provides no get endpoint, retrying
 *    deletion is used to verify non-existence.
 * 5. Attempt to delete the same user unauthorized (without authentication) and
 *    verify access denial.
 */
export async function test_api_telegram_file_downloader_administrator_endusers_delete_success(
  connection: api.IConnection,
) {
  // 1. Administrator joins (authenticates) to receive tokens
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(16);
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create a new end user to be deleted
  const endUserEmail = `user-${RandomGenerator.alphaNumeric(6)}@example.com`;
  const endUserPasswordHash = RandomGenerator.alphaNumeric(16);
  const enduser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.endusers.create(connection, {
      body: {
        email: endUserEmail,
        password_hash: endUserPasswordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(enduser);

  // 3. Delete the created end user by enduserId using administrator delete endpoint
  await api.functional.telegramFileDownloader.administrator.endusers.erase(
    connection,
    {
      enduserId: enduser.id,
    },
  );

  // 4. Verify that retrieving the deleted user results in an error (404)
  // Since no explicit retrieval endpoint is provided, attempting delete again serves as a proxy
  await TestValidator.error(
    "retrieval after delete should fail with error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.endusers.erase(
        connection,
        {
          enduserId: enduser.id,
        },
      );
    },
  );

  // 5. Attempt unauthorized deletion (simulate unauthenticated connection with empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion attempt must be denied",
    async () => {
      await api.functional.telegramFileDownloader.administrator.endusers.erase(
        unauthenticatedConnection,
        {
          enduserId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
