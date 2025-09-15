import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderTelegramApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTelegramApiCredential";

/**
 * Test scenario for creating a new Telegram API credential by an administrator
 * user.
 *
 * Steps:
 *
 * 1. Register an administrator user using join API with random but realistic email
 *    and hashed password.
 * 2. Login as the administrator user to refresh auth token state.
 * 3. Create a Telegram API credential with random but realistic data for bot_name,
 *    bot_token, and is_active flag.
 * 4. Validate that the created credential has correct data and all timestamps and
 *    UUIDs valid.
 * 5. Attempt to create a Telegram API credential from an unauthenticated
 *    connection and confirm access is denied.
 */
export async function test_api_telegram_api_credential_creation(
  connection: api.IConnection,
) {
  // 1. Register as administrator
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(20); // simulating hashed password though in reality should be hashed
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "admin email after join",
    adminAuthorized.email,
    adminCreateBody.email,
  );

  // 2. Login as administrator to refresh token
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoginAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);
  TestValidator.equals(
    "admin email after login",
    adminLoginAuthorized.email,
    adminCreateBody.email,
  );

  // 3. Create a Telegram API credential
  const botName = RandomGenerator.name().replace(/\s/g, "");
  const botToken = `${typia.random<string & tags.Pattern<"^[0-9]+:[A-Za-z0-9_-]+$">>()}`; // format e.g., digits:token
  const isActive = true;

  const createBody = {
    bot_name: botName,
    bot_token: botToken,
    is_active: isActive,
  } satisfies ITelegramFileDownloaderTelegramApiCredential.ICreate;

  const telegramCredential: ITelegramFileDownloaderTelegramApiCredential =
    await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(telegramCredential);
  TestValidator.equals(
    "telegram api credential bot_name",
    telegramCredential.bot_name,
    createBody.bot_name,
  );
  TestValidator.equals(
    "telegram api credential bot_token",
    telegramCredential.bot_token,
    createBody.bot_token,
  );
  TestValidator.equals(
    "telegram api credential is_active",
    telegramCredential.is_active,
    createBody.is_active,
  );
  // Check UUID format for id
  TestValidator.predicate(
    "telegram api credential id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      telegramCredential.id,
    ),
  );
  // Check created_at and updated_at format
  TestValidator.predicate(
    "telegram api credential created_at format",
    typeof telegramCredential.created_at === "string" &&
      telegramCredential.created_at.length > 0,
  );
  TestValidator.predicate(
    "telegram api credential updated_at format",
    typeof telegramCredential.updated_at === "string" &&
      telegramCredential.updated_at.length > 0,
  );

  // 4. Unauthorized access test - create unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized create error",
    async () =>
      await api.functional.telegramFileDownloader.administrator.telegramApiCredentials.create(
        unauthConnection,
        {
          body: createBody,
        },
      ),
  );
}
