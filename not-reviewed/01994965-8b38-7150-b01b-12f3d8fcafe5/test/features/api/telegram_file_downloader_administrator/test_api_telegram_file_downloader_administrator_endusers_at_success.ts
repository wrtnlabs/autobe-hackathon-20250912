import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * Test detailed retrieval of a Telegram File Downloader end user by
 * administrator.
 *
 * This test validates the entire process of administrator authentication,
 * end user creation, and retrieval of detailed end user data by
 * administrator. It also verifies that unauthorized access attempts and
 * retrievals of non-existent end user IDs are handled properly.
 *
 * Steps:
 *
 * 1. Register and authenticate an administrator user via
 *    /auth/administrator/join.
 * 2. Create a Telegram File Downloader end user with unique email and password
 *    hash.
 * 3. Retrieve the created end user by the administrator using the specific
 *    enduserId.
 * 4. Confirm the retrieved end user data matches the created user data,
 *    excluding sensitive password hash exposure.
 * 5. Attempt to retrieve with a randomly generated invalid enduserId and
 *    expect a 404 error.
 * 6. Attempt unauthorized retrieval without authentication and expect an
 *    authorization error.
 */
export async function test_api_telegram_file_downloader_administrator_endusers_at_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate administrator
  const adminEmail = `${RandomGenerator.alphabets(6)}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create Telegram File Downloader end user
  const endUserEmail = `${RandomGenerator.alphabets(6)}@example.com`;
  const endUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const newEndUser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.endusers.create(connection, {
      body: {
        email: endUserEmail,
        password_hash: endUserPasswordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(newEndUser);

  // 3. Retrieve created end user by valid enduserId
  const retrievedEndUser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.administrator.endusers.at(
      connection,
      { enduserId: newEndUser.id },
    );
  typia.assert(retrievedEndUser);

  // 4. Validate retrieved data matches creation data
  TestValidator.equals(
    "end user email matches",
    retrievedEndUser.email,
    newEndUser.email,
  );
  TestValidator.equals(
    "end user id matches",
    retrievedEndUser.id,
    newEndUser.id,
  );
  TestValidator.predicate(
    "password_hash matches",
    retrievedEndUser.password_hash === newEndUser.password_hash,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedEndUser.created_at,
    newEndUser.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedEndUser.updated_at,
    newEndUser.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedEndUser.deleted_at ?? null,
    newEndUser.deleted_at ?? null,
  );

  // 5. Attempt retrieval with invalid enduserId and expect 404 error
  const invalidUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval with invalid enduserId triggers 404 error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.endusers.at(
        connection,
        { enduserId: invalidUuid },
      );
    },
  );

  // 6. Attempt unauthorized retrieval without authentication and expect error
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized retrieval should be denied",
    async () => {
      await api.functional.telegramFileDownloader.administrator.endusers.at(
        unauthorizedConnection,
        { enduserId: newEndUser.id },
      );
    },
  );
}
