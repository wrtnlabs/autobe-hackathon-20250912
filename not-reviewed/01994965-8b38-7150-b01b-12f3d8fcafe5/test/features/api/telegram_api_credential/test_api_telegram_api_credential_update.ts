import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderTelegramApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredential";

/**
 * E2E test for updating Telegram API credentials by an administrator.
 *
 * This test validates the update operation by:
 *
 * 1. Creating and authenticating an administrator user.
 * 2. Creating a Telegram API credential.
 * 3. Updating the credential with new data.
 * 4. Verifying updates persist correctly.
 * 5. Testing update with invalid data to confirm validation errors.
 * 6. Testing unauthorized access is denied.
 */
export async function test_api_telegram_api_credential_update(
  connection: api.IConnection,
) {
  // 1. Administrator user join
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32); // Random string simulating hashed password
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Administrator user login
  const loggedAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    });
  typia.assert(loggedAdmin);

  // 3. Create Telegram API credential
  const createdCredential =
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.create(
      connection,
      {
        body: {
          bot_name: `Bot_${RandomGenerator.alphaNumeric(4)}`,
          bot_token: `123456:${RandomGenerator.alphaNumeric(20)}`,
          is_active: true,
        } satisfies ITelegramFileDownloaderTelegramApiCredential.ICreate,
      },
    );
  typia.assert(createdCredential);

  // 4. Update the Telegram API credential
  const updateBody: ITelegramFileDownloaderTelegramApiCredential.IUpdate = {
    bot_name: `UpdatedBot_${RandomGenerator.alphaNumeric(4)}`,
    bot_token: `654321:${RandomGenerator.alphaNumeric(20)}`,
    is_active: false,
  };

  const updatedCredential =
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.update(
      connection,
      {
        telegramApiCredentialId: createdCredential.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCredential);

  // Validate updated fields
  TestValidator.equals(
    "updated bot_name should match",
    updatedCredential.bot_name,
    updateBody.bot_name,
  );
  TestValidator.equals(
    "updated bot_token should match",
    updatedCredential.bot_token,
    updateBody.bot_token,
  );
  TestValidator.equals(
    "updated is_active should match",
    updatedCredential.is_active,
    updateBody.is_active,
  );

  // 5. Test update with empty bot_name (expect failure)
  await TestValidator.error(
    "update with empty bot_name should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.update(
        connection,
        {
          telegramApiCredentialId: createdCredential.id,
          body: {
            bot_name: "",
            bot_token: `token_${RandomGenerator.alphaNumeric(10)}`,
            is_active: true,
          } satisfies ITelegramFileDownloaderTelegramApiCredential.IUpdate,
        },
      );
    },
  );

  // 6. Test update with empty bot_token (expect failure)
  await TestValidator.error(
    "update with empty bot_token should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.update(
        connection,
        {
          telegramApiCredentialId: createdCredential.id,
          body: {
            bot_name: `Name_${RandomGenerator.alphaNumeric(5)}`,
            bot_token: "",
            is_active: true,
          } satisfies ITelegramFileDownloaderTelegramApiCredential.IUpdate,
        },
      );
    },
  );

  // 7. Test update with invalid telegramApiCredentialId (expect failure)
  await TestValidator.error(
    "update with invalid telegramApiCredentialId should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.update(
        connection,
        {
          telegramApiCredentialId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 8. Test unauthorized update: no authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.update(
      unauthConn,
      {
        telegramApiCredentialId: createdCredential.id,
        body: updateBody,
      },
    );
  });
}
