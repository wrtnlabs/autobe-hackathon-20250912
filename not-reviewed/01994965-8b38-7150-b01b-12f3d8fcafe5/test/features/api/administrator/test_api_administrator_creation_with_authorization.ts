import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAdministrators } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrators";

export async function test_api_administrator_creation_with_authorization(
  connection: api.IConnection,
) {
  // 1. Register an initial administrator user
  // Use realistic email and securely hashed password
  const initialAdminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;
  const initialAdminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: initialAdminCreateBody,
    });
  typia.assert(initialAdminAuthorized);

  // 2. Login with the initial administrator user
  const loginBody = {
    email: initialAdminCreateBody.email,
    password: "strongPassword123!",
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;
  const loggedInAdminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdminAuthorized);

  TestValidator.equals(
    "Initial admin email after login should match creation",
    loggedInAdminAuthorized.email,
    initialAdminCreateBody.email,
  );

  // 3. Using authenticated context (token automatically managed), create a new administrator user
  const newAdminCreateBody = {
    email: `newadmin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrators.ICreate;

  const createdAdmin: ITelegramFileDownloaderAdministrators =
    await api.functional.telegramFileDownloader.administrator.administrators.create(
      connection,
      { body: newAdminCreateBody },
    );
  typia.assert(createdAdmin);

  TestValidator.equals(
    "Created admin email should be same as requested",
    createdAdmin.email,
    newAdminCreateBody.email,
  );

  // 4. Validate that creation returned a valid UUID for id
  TestValidator.predicate(
    "Created admin id must be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdAdmin.id,
    ),
  );

  // 5. Validate timestamps are ISO 8601 date-time format strings
  TestValidator.predicate(
    "Created at timestamp is ISO 8601",
    typeof createdAdmin.created_at === "string" &&
      !isNaN(Date.parse(createdAdmin.created_at)),
  );
  TestValidator.predicate(
    "Updated at timestamp is ISO 8601",
    typeof createdAdmin.updated_at === "string" &&
      !isNaN(Date.parse(createdAdmin.updated_at)),
  );

  // 6. Validate deleted_at is null, indicating active admin
  TestValidator.equals(
    "Deleted at is null on newly created admin",
    createdAdmin.deleted_at,
    null,
  );

  // 7. Test that attempting to create an admin with the same email fails
  await TestValidator.error(
    "Creating admin with duplicate email should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.create(
        connection,
        { body: newAdminCreateBody },
      );
    },
  );
}
