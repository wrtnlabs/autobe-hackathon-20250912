import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAdministrators } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrators";

export async function test_api_administrator_update_information(
  connection: api.IConnection,
) {
  // 1. Create a new administrator by joining
  const createData1 = {
    email: `test_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const createdAdmin1 = await api.functional.auth.administrator.join(
    connection,
    {
      body: createData1,
    },
  );
  typia.assert(createdAdmin1);

  // 2. Create a second administrator for duplicate email test
  const createData2 = {
    email: `test_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const createdAdmin2 = await api.functional.auth.administrator.join(
    connection,
    {
      body: createData2,
    },
  );
  typia.assert(createdAdmin2);

  // 3. Login as the first administrator
  const loginData = {
    email: createData1.email,
    password: createData1.password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loggedInAdmin = await api.functional.auth.administrator.login(
    connection,
    {
      body: loginData,
    },
  );
  typia.assert(loggedInAdmin);

  // 4. Prepare update data with changed email and password_hash
  const updateEmail = `updated_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const updatePasswordHash = RandomGenerator.alphaNumeric(32);

  const updateData = {
    email: updateEmail,
    password_hash: updatePasswordHash,
  } satisfies ITelegramFileDownloaderAdministrators.IUpdate;

  // 5. Update administrator information successfully
  const updatedAdmin =
    await api.functional.telegramFileDownloader.administrator.administrators.update(
      connection,
      {
        administratorId: createdAdmin1.id,
        body: updateData,
      },
    );
  typia.assert(updatedAdmin);

  TestValidator.equals(
    "administrator id unchanged after update",
    updatedAdmin.id,
    createdAdmin1.id,
  );
  TestValidator.equals(
    "email updated correctly",
    updatedAdmin.email,
    updateEmail,
  );
  TestValidator.equals(
    "password hash updated correctly",
    updatedAdmin.password_hash,
    updatePasswordHash,
  );

  // 6. Confirm updated timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof updatedAdmin.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        updatedAdmin.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof updatedAdmin.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        updatedAdmin.updated_at,
      ),
  );

  // 7. Error test: Attempt to update a non-existent administrator should error
  const fakeAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent administrator should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.update(
        connection,
        {
          administratorId: fakeAdminId,
          body: {
            email: `nonexistent_${RandomGenerator.alphaNumeric(6)}@example.com`,
          } satisfies ITelegramFileDownloaderAdministrators.IUpdate,
        },
      );
    },
  );

  // 8. Error test: Unauthorized update attempt should fail
  // Create a fresh connection with empty headers (unauthenticated)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update administrator",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.update(
        unauthenticatedConn,
        {
          administratorId: createdAdmin1.id,
          body: {
            email: `unauth_${RandomGenerator.alphaNumeric(6)}@example.com`,
          } satisfies ITelegramFileDownloaderAdministrators.IUpdate,
        },
      );
    },
  );

  // 9. Error test: Attempting to update email to an existing administrator's email should fail
  await TestValidator.error(
    "updating to duplicate email should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.update(
        connection,
        {
          administratorId: createdAdmin1.id,
          body: {
            email: createdAdmin2.email, // existing email
          } satisfies ITelegramFileDownloaderAdministrators.IUpdate,
        },
      );
    },
  );
}
