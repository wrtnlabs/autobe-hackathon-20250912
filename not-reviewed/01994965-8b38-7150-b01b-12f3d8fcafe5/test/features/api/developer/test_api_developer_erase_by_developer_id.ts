import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * Test suite to validate the deletion of developer users by developerId in the
 * Telegram File Downloader system.
 *
 * This function:
 *
 * 1. Creates and authenticates a new developer user.
 * 2. Deletes the created developer user by developer ID.
 * 3. Verifies that unauthorized deletion attempts fail.
 * 4. Confirms that deletion attempts for non-existent developer IDs produce
 *    errors.
 *
 * Ensures proper authorization enforcement and business logic correctness.
 */
export async function test_api_developer_erase_by_developer_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new developer via join API
  const createBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;
  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, { body: createBody });
  typia.assert(developer);

  // 2. Delete the created developer user by developer.id
  await api.functional.telegramFileDownloader.developer.developers.erase(
    connection,
    {
      developerId: developer.id,
    },
  );

  // 3. Test unauthorized delete attempt without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized delete without authentication should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.developers.erase(
        unauthenticatedConnection,
        {
          developerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Test deletion of non-existent developerId by authenticated developer (should error)
  await TestValidator.error(
    "deleting non-existent developerId should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.developers.erase(
        connection,
        {
          developerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
