import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * This test validates the full update workflow of a Telegram File Downloader
 * end user by an administrator.
 *
 * The test performs the following steps:
 *
 * 1. Administrator account creation via /auth/administrator/join to obtain
 *    authorization.
 * 2. Creating a new Telegram File Downloader end user via POST
 *    /telegramFileDownloader/endusers with a valid unique email and password
 *    hash.
 * 3. Updating the created end user via PUT
 *    /telegramFileDownloader/administrator/endusers/{enduserId} with valid
 *    update data, such as changing the email to a new unique value or modifying
 *    the password hash.
 * 4. Validating the update by checking the response data for accuracy.
 * 5. Attempting to update the same end user with a duplicate email used by another
 *    end user, expecting a conflict error to be thrown.
 * 6. Attempting update without proper admin authentication to verify access is
 *    denied.
 *
 * All API responses are validated with typia.assert() to ensure type
 * correctness. TestValidator functions verify business rules such as unique
 * email constraints and authentication enforcement. RandomGenerator and
 * typia.random generate realistic test data, including emails and password
 * hashes. The flow switches connections to test unauthorized access.
 *
 * Strict type safety and schema compliance are enforced throughout, with all
 * required properties included as per definitions. No type error testing or
 * invalid data tests are performed to ensure compile-time safety. This
 * comprehensive end-to-end test ensures the update operation is secure,
 * consistent, and behaves correctly under success and failure scenarios.
 */
export async function test_api_telegram_file_downloader_administrator_endusers_update_success(
  connection: api.IConnection,
) {
  // 1. Administrator account creation via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new Telegram File Downloader end user
  const endUserEmail = typia.random<string & tags.Format<"email">>();
  const endUserPasswordHash = RandomGenerator.alphaNumeric(64);
  const endUser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.endusers.create(connection, {
      body: {
        email: endUserEmail,
        password_hash: endUserPasswordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(endUser);

  // 3. Update the created end user with new email and password hash
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPasswordHash = RandomGenerator.alphaNumeric(64);

  const updatedUser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.administrator.endusers.update(
      connection,
      {
        enduserId: endUser.id,
        body: {
          email: newEmail,
          password_hash: newPasswordHash,
        } satisfies ITelegramFileDownloaderEndUser.IUpdate,
      },
    );
  typia.assert(updatedUser);
  TestValidator.equals("email updated", updatedUser.email, newEmail);
  TestValidator.notEquals(
    "password_hash updated",
    updatedUser.password_hash,
    endUserPasswordHash,
  );

  // 4. Attempt to update with duplicate email to verify conflict rejection
  const anotherEndUserEmail = typia.random<string & tags.Format<"email">>();
  const anotherEndUserPasswordHash = RandomGenerator.alphaNumeric(64);
  const anotherEndUser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.endusers.create(connection, {
      body: {
        email: anotherEndUserEmail,
        password_hash: anotherEndUserPasswordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(anotherEndUser);

  await TestValidator.error("duplicate email update fails", async () => {
    await api.functional.telegramFileDownloader.administrator.endusers.update(
      connection,
      {
        enduserId: endUser.id,
        body: {
          email: anotherEndUserEmail, // duplicate email
        } satisfies ITelegramFileDownloaderEndUser.IUpdate,
      },
    );
  });

  // 5. Verify unauthorized update attempts are denied
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized update attempt fails", async () => {
    await api.functional.telegramFileDownloader.administrator.endusers.update(
      unauthenticatedConnection,
      {
        enduserId: endUser.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies ITelegramFileDownloaderEndUser.IUpdate,
      },
    );
  });
}
