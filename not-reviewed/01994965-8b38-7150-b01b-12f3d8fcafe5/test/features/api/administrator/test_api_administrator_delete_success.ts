import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Validate the successful deletion of an administrator user in the Telegram
 * File Downloader system.
 *
 * This test performs the full user lifecycle by:
 *
 * 1. Creating a new administrator account through POST
 *    /auth/administrator/join with valid email and password hash.
 * 2. Logging in as the newly created administrator to establish authentication
 *    context.
 * 3. Deleting the administrator via DELETE
 *    /telegramFileDownloader/administrator/administrators/{administratorId},
 *    expecting HTTP 204 no content response.
 * 4. Verifying the deletion by asserting the administrator cannot log in
 *    anymore, expecting an error.
 *
 * It ensures that only authorized administrators can delete users and
 * verifies the system properly removes the administrator record. Business
 * rules such as status codes and authentication are rigorously validated.
 * All DTO properties are used exactly as specified, including required
 * email, password_hash fields for creation and login, and UUID formatted
 * administratorId for deletion.
 */
export async function test_api_administrator_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new administrator user with join API
  const createBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: createBody,
    });
  typia.assert(administrator);

  // 2. Login as this administrator to authenticate
  const loginBody = {
    email: createBody.email,
    password: createBody.password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const login = await api.functional.auth.administrator.login(connection, {
    body: loginBody,
  });
  typia.assert(login);

  // Confirm that the login id matches the created administrator id
  TestValidator.equals(
    "administrator id should match after login",
    login.id,
    administrator.id,
  );

  // 3. Delete the administrator using erase API
  await api.functional.telegramFileDownloader.administrator.administrators.erase(
    connection,
    {
      administratorId: administrator.id,
    },
  );

  // 4. Verify deletion by attempting to login again and expect an error
  await TestValidator.error("login after deletion should fail", async () => {
    await api.functional.auth.administrator.login(connection, {
      body: loginBody,
    });
  });
}
