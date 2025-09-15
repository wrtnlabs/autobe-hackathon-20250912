import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * Validate the update functionality of developer users in the Telegram File
 * Downloader service.
 *
 * This test function carries out the full update workflow including
 * authentication, authorization, creating a target developer user under an
 * administrator role, performing the update under a developer role, verifying
 * the updated fields, and finally testing access failure when unauthorized.
 *
 * Steps:
 *
 * 1. Create and authenticate a developer user for operation purposes.
 * 2. Create and authenticate an administrator user to create a developer record to
 *    update.
 * 3. Create a developer user record via administrator authorization to be the
 *    update target.
 * 4. Authenticate as the developer user to validate authorization.
 * 5. Update the developer user record and assert the new values, including
 *    updated_at timestamp.
 * 6. Attempt update without authentication to confirm unauthorized failure.
 */
export async function test_api_developer_update_by_id_success_and_unauthorized_failure(
  connection: api.IConnection,
) {
  // 1. Join as developer user (Dev1) for authentication context
  const developer1Email = typia.random<string & tags.Format<"email">>();
  const developer1Pass = RandomGenerator.alphaNumeric(20);
  const developer1: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developer1Email,
        password_hash: developer1Pass,
      } satisfies ITelegramFileDownloaderDeveloper.ICreate,
    });
  typia.assert(developer1);

  // 2. Join as administrator user (Admin1), required for creating developers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(20);
  const adminUser: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPass,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(adminUser);

  // Admin login to establish authorization context for developer creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
    } satisfies ITelegramFileDownloaderAdministrator.ILogin,
  });

  // 3. Create developer user record to be updated (Dev2) via administrator authorization
  const originalDeveloperData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const devToUpdate: ITelegramFileDownloaderDeveloper =
    await api.functional.telegramFileDownloader.administrator.developers.create(
      connection,
      {
        body: originalDeveloperData,
      },
    );
  typia.assert(devToUpdate);

  // Save the previous updated_at timestamp for comparison after update
  const previousUpdatedAt = devToUpdate.updated_at;

  // 4. Login as developer1 for developer role authentication
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developer1Email,
      password: developer1Pass,
    } satisfies ITelegramFileDownloaderDeveloper.ILogin,
  });

  // 5. Update developer user (Dev2) with new email and password_hash
  const updateBody: ITelegramFileDownloaderDeveloper.IUpdate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
  };

  const updatedDeveloper: ITelegramFileDownloaderDeveloper =
    await api.functional.telegramFileDownloader.developer.developers.update(
      connection,
      {
        developerId: devToUpdate.id,
        body: updateBody,
      },
    );

  typia.assert(updatedDeveloper);

  // Assertions to confirm updates
  TestValidator.equals(
    "developer email is updated",
    updatedDeveloper.email,
    updateBody.email,
  );
  TestValidator.notEquals(
    "password_hash is changed",
    updatedDeveloper.password_hash,
    devToUpdate.password_hash,
  );

  // updated_at timestamp should be later than previous
  TestValidator.predicate(
    "updated_at timestamp is later than previous",
    new Date(updatedDeveloper.updated_at).getTime() >
      new Date(previousUpdatedAt).getTime(),
  );

  // 6. Test unauthorized update attempt by creating new connection without auth headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.telegramFileDownloader.developer.developers.update(
      unauthConn,
      {
        developerId: devToUpdate.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  });
}
