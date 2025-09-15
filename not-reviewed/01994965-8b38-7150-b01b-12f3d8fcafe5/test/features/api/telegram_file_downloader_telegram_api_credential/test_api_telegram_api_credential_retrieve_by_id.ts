import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderTelegramApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredential";

/**
 * E2E test for Telegram API credential retrieval by ID.
 *
 * This test covers the complete workflow from administrator registration,
 * login, creation of a Telegram API credential, and retrieval by ID.
 *
 * It validates successful data retrieval and correctness, error handling for
 * invalid IDs, and enforcement of authorization requirements.
 *
 * Steps:
 *
 * 1. Register and authenticate administrator user.
 * 2. Create Telegram API credential.
 * 3. Retrieve the credential by ID and verify properties.
 * 4. Verify error on non-existent ID.
 * 5. Verify unauthorized access is rejected.
 */
export async function test_api_telegram_api_credential_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Administrator user join
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Administrator login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;
  const adminLogin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create Telegram API credential
  const createCredentialBody = {
    bot_name: `Bot_${RandomGenerator.alphaNumeric(5)}`,
    bot_token: `${RandomGenerator.alphaNumeric(6)}:ABCDE-${RandomGenerator.alphaNumeric(10)}`,
    is_active: true,
  } satisfies ITelegramFileDownloaderTelegramApiCredential.ICreate;
  const createdCredential: ITelegramFileDownloaderTelegramApiCredential =
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.create(
      connection,
      {
        body: createCredentialBody,
      },
    );
  typia.assert(createdCredential);

  // 4. Retrieve Telegram API credential by ID
  const retrievedCredential: ITelegramFileDownloaderTelegramApiCredential =
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.at(
      connection,
      {
        telegramApiCredentialId: createdCredential.id,
      },
    );
  typia.assert(retrievedCredential);

  TestValidator.equals(
    "credential ID should match",
    retrievedCredential.id,
    createdCredential.id,
  );
  TestValidator.equals(
    "credential bot_name should match",
    retrievedCredential.bot_name,
    createdCredential.bot_name,
  );
  TestValidator.equals(
    "credential bot_token should match",
    retrievedCredential.bot_token,
    createdCredential.bot_token,
  );
  TestValidator.equals(
    "credential is_active should match",
    retrievedCredential.is_active,
    createdCredential.is_active,
  );

  // 5. Attempt to retrieve credential by invalid ID (non existent)
  const randomInvalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on non-existent telegramApiCredentialId",
    async () => {
      await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.at(
        connection,
        {
          telegramApiCredentialId: randomInvalidId,
        },
      );
    },
  );

  // 6. Unauthenticated retrieval attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.at(
      unauthenticatedConnection,
      {
        telegramApiCredentialId: createdCredential.id,
      },
    );
  });
}
