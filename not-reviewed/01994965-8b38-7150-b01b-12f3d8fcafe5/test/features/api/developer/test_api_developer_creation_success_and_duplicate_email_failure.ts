import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

export async function test_api_developer_creation_success_and_duplicate_email_failure(
  connection: api.IConnection,
) {
  // 1. Administrator joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a developer user with a unique email
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash = RandomGenerator.alphaNumeric(64);
  const developer: ITelegramFileDownloaderDeveloper =
    await api.functional.telegramFileDownloader.administrator.developers.create(
      connection,
      {
        body: {
          email: developerEmail,
          password_hash: developerPasswordHash,
        } satisfies ITelegramFileDownloaderDeveloper.ICreate,
      },
    );
  typia.assert(developer);

  // 3. Attempt to create another developer with the same email, expect failure
  await TestValidator.error(
    "duplicate email creation should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.developers.create(
        connection,
        {
          body: {
            email: developerEmail,
            password_hash: RandomGenerator.alphaNumeric(64),
          } satisfies ITelegramFileDownloaderDeveloper.ICreate,
        },
      );
    },
  );
}
