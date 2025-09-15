import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * This E2E test verifies the lifecycle of an administrator user deletion by ID.
 *
 * It covers:
 *
 * 1. Administrator registration via the join API with valid email and hashed
 *    password.
 * 2. Administrator login with the same credentials to authenticate and obtain
 *    token.
 * 3. Administrator deletion using the erase API.
 * 4. Verification that the deleted administrator can't login anymore.
 * 5. Verification that attempting to delete again results in an error.
 *
 * All API responses are validated for type correctness using typia.assert. All
 * error scenarios use TestValidator.error with descriptive messages. This
 * ensures that administrator deletion is effective and prevents further access
 * by the deleted user.
 */
export async function test_api_administrator_deletion_by_id(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration
  const adminEmail: string = `${RandomGenerator.name(1).toLocaleLowerCase()}_${RandomGenerator.alphaNumeric(5).toLocaleLowerCase()}@test.com`;
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const passwordHash: string = `hash_${adminPassword}`;

  const joinedAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(joinedAdmin);

  // Step 2: Administrator login
  const loggedInAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Administrator deletion
  await api.functional.telegramFileDownloader.administrator.administrators.erase(
    connection,
    {
      administratorId: joinedAdmin.id,
    },
  );

  // Step 4: Post-deletion login should fail
  await TestValidator.error("login after deletion should fail", async () => {
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    });
  });

  // Step 5: Deleting again should fail
  await TestValidator.error(
    "deleting already deleted administrator should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.erase(
        connection,
        {
          administratorId: joinedAdmin.id,
        },
      );
    },
  );
}
