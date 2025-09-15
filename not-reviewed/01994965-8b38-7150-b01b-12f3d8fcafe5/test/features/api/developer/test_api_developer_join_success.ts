import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

export async function test_api_developer_join_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid email and password hash
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64);

  // Step 2: Register new developer user
  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: email,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderDeveloper.ICreate,
    });
  typia.assert(developer);

  // Step 3: Attempt to register duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.developer.join(connection, {
        body: {
          email: email,
          password_hash: passwordHash,
        } satisfies ITelegramFileDownloaderDeveloper.ICreate,
      });
    },
  );
}
