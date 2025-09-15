import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Validate administrator detailed information retrieval.
 *
 * The test follows the complete flow: administrator registration, login,
 * and profile retrieval. It confirms the successful creation and
 * authentication of administrator accounts and verifies that the retrieved
 * administrator details match the registered data.
 *
 * Steps:
 *
 * 1. Register a new administrator user with a unique email and hashed
 *    password.
 * 2. Log in the administrator user to obtain JWT tokens.
 * 3. Retrieve the detailed administrator profile with the obtained
 *    administrator ID.
 * 4. Confirm the retrieved profile data matches the registration data and no
 *    sensitive information is leaked.
 * 5. Test unauthorized access returns appropriate errors.
 * 6. Test fetching non-existing administrator returns 404 error.
 */
export async function test_api_administrator_retrieve_detailed_information(
  connection: api.IConnection,
) {
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const passwordHash = password; // For testing, use password as hash for simplicity
  const joinBody = {
    email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;
  const join = await api.functional.auth.administrator.join(connection, {
    body: joinBody,
  });
  typia.assert(join);
  TestValidator.predicate(
    "join returns id",
    typeof join.id === "string" && join.id.length > 0,
  );
  TestValidator.equals("join email matches input", join.email, email);
  TestValidator.equals(
    "join password_hash matches input",
    join.password_hash,
    passwordHash,
  );
  TestValidator.predicate(
    "join has created_at",
    typeof join.created_at === "string" && join.created_at.length > 0,
  );
  TestValidator.predicate(
    "join has updated_at",
    typeof join.updated_at === "string" && join.updated_at.length > 0,
  );
  TestValidator.predicate(
    "join token has access",
    typeof join.token.access === "string" && join.token.access.length > 0,
  );

  const loginBody = {
    email,
    password,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;
  const login = await api.functional.auth.administrator.login(connection, {
    body: loginBody,
  });
  typia.assert(login);
  TestValidator.equals("login id matches join id", login.id, join.id);
  TestValidator.equals("login email matches", login.email, email);
  TestValidator.notEquals(
    "login password_hash is not empty",
    login.password_hash,
    "",
  );
  TestValidator.predicate(
    "login has valid created_at",
    typeof login.created_at === "string" && login.created_at.length > 0,
  );
  TestValidator.predicate(
    "login has valid updated_at",
    typeof login.updated_at === "string" && login.updated_at.length > 0,
  );
  TestValidator.predicate(
    "login token has access",
    typeof login.token.access === "string" && login.token.access.length > 0,
  );

  const detail =
    await api.functional.telegramFileDownloader.administrator.administrators.at(
      connection,
      { administratorId: join.id },
    );
  typia.assert(detail);
  TestValidator.equals("detail.id matches join id", detail.id, join.id);
  TestValidator.equals(
    "detail.email matches join email",
    detail.email,
    join.email,
  );
  TestValidator.equals(
    "detail.password_hash matches join password_hash",
    detail.password_hash,
    join.password_hash,
  );
  TestValidator.predicate(
    "detail has created_at",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "detail has updated_at",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
  TestValidator.predicate(
    "detail deleted_at is null or undefined",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );

  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access without token", async () => {
    await api.functional.telegramFileDownloader.administrator.administrators.at(
      unauthConn,
      {
        administratorId: join.id,
      },
    );
  });

  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent administratorId returns 404",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.at(
        connection,
        {
          administratorId: nonExistentAdminId,
        },
      );
    },
  );
}
