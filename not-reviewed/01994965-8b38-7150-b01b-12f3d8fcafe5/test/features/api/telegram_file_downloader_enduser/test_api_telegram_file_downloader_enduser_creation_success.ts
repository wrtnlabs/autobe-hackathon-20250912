import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

export async function test_api_telegram_file_downloader_enduser_creation_success(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // simulate a password hash
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new end user
  const endUserEmail = typia.random<string & tags.Format<"email">>();
  const endUserPasswordHash = RandomGenerator.alphaNumeric(64); // simulate password hash
  const endUser: ITelegramFileDownloaderEndUser =
    await api.functional.telegramFileDownloader.endusers.create(connection, {
      body: {
        email: endUserEmail,
        password_hash: endUserPasswordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(endUser);

  // 3. Verify returned properties
  TestValidator.predicate(
    "end user id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      endUser.id,
    ),
  );
  TestValidator.equals(
    "end user email matches input",
    endUser.email,
    endUserEmail,
  );
  TestValidator.equals(
    "end user password hash matches input",
    endUser.password_hash,
    endUserPasswordHash,
  );
  TestValidator.predicate(
    "end user created_at ISO 8601 format",
    typeof endUser.created_at === "string" && endUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "end user updated_at ISO 8601 format",
    typeof endUser.updated_at === "string" && endUser.updated_at.length > 0,
  );
  TestValidator.equals("end user deleted_at is null", endUser.deleted_at, null);

  // 4. Attempt duplicate email creation should fail
  await TestValidator.error("duplicate email should throw", async () => {
    await api.functional.telegramFileDownloader.endusers.create(connection, {
      body: {
        email: endUserEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  });
}
