import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAdministrators } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrators";

/**
 * End-to-end test for the administrator update API in
 * telegramFileDownloader.
 *
 * This test covers creating and authenticating administrator users,
 * updating an administrator's email and password hash, and validating both
 * successful updates and failure scenarios:
 *
 * - Duplicate email error (expects HTTP 409 Conflict)
 * - Updating non-existent administrator (expects HTTP 404 Not Found)
 *
 * The scenario ensures that all authentication tokens and credentials are
 * handled securely and updates persist correctly.
 *
 * Workflow:
 *
 * 1. Register initial administrator
 * 2. Authenticate initial administrator
 * 3. Register second administrator for conflict testing
 * 4. Update initial administrator with new email and password hash
 * 5. Confirm updated administrator details
 * 6. Authenticate updated administrator
 * 7. Test duplicate email error
 * 8. Test updating non-existent administrator error
 */
export async function test_api_administrator_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register initial administrator
  const initialEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const initialPasswordHash = RandomGenerator.alphaNumeric(32);
  const initialAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: initialEmail,
        password_hash: initialPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    },
  );
  typia.assert(initialAdmin);

  // Step 2: Authenticate initial administrator
  const authInitialAdmin = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: initialEmail,
        password: initialPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    },
  );
  typia.assert(authInitialAdmin);
  TestValidator.equals(
    "initial admin id matches",
    authInitialAdmin.id,
    initialAdmin.id,
  );
  TestValidator.equals(
    "initial admin email matches",
    authInitialAdmin.email,
    initialEmail,
  );

  // Step 3: Register second administrator to use for conflict testing
  const secondEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const secondPasswordHash = RandomGenerator.alphaNumeric(32);
  const secondAdmin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: secondEmail,
      password_hash: secondPasswordHash,
    } satisfies ITelegramFileDownloaderAdministrator.ICreate,
  });
  typia.assert(secondAdmin);

  // Step 4: Update initial administrator with new email and password hash
  const updatedEmail = `${RandomGenerator.alphaNumeric(6)}@example.org`;
  const updatedPasswordHash = RandomGenerator.alphaNumeric(40);
  const updatedAdmin =
    await api.functional.telegramFileDownloader.administrator.administrators.update(
      connection,
      {
        administratorId: initialAdmin.id,
        body: {
          email: updatedEmail,
          password_hash: updatedPasswordHash,
        } satisfies ITelegramFileDownloaderAdministrators.IUpdate,
      },
    );
  typia.assert(updatedAdmin);

  // Validate updated values
  TestValidator.equals(
    "updated admin id matches original",
    updatedAdmin.id,
    initialAdmin.id,
  );
  TestValidator.equals(
    "updated admin email matches new email",
    updatedAdmin.email,
    updatedEmail,
  );
  TestValidator.notEquals(
    "updated password_hash differs from original",
    updatedAdmin.password_hash,
    initialAdmin.password_hash,
  );

  // Step 5: Authenticate updated administrator with new credentials
  const authUpdatedAdmin = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: updatedEmail,
        password: updatedPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    },
  );
  typia.assert(authUpdatedAdmin);
  TestValidator.equals(
    "auth updated admin id matches",
    authUpdatedAdmin.id,
    initialAdmin.id,
  );
  TestValidator.equals(
    "auth updated admin email matches",
    authUpdatedAdmin.email,
    updatedEmail,
  );

  // Step 6: Test updating with duplicate email from second administrator (should fail with 409)
  await TestValidator.error(
    "update with duplicate email should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.update(
        connection,
        {
          administratorId: initialAdmin.id,
          body: {
            email: secondEmail, // duplicate
          } satisfies ITelegramFileDownloaderAdministrators.IUpdate,
        },
      );
    },
  );

  // Step 7: Test updating non-existent administrator (should fail with 404)
  // Generate fake UUID for testing
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent administrator should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.update(
        connection,
        {
          administratorId: fakeId,
          body: {
            email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
          } satisfies ITelegramFileDownloaderAdministrators.IUpdate,
        },
      );
    },
  );
}
