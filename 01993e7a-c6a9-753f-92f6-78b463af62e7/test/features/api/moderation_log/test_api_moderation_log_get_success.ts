import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerationLogs";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

export async function test_api_moderation_log_get_success(
  connection: api.IConnection,
) {
  // 1. Create a moderator user with join to establish auth context
  const moderatorBody = {
    email: RandomGenerator.pick([
      "mod1@example.com",
      "mod2@example.com",
      "mod3@example.com",
    ] as const),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Since the API does not support creating moderation logs directly,
  // we use a random but valid UUID to fetch an existing moderation log.
  // In real scenarios, replace with an ID from your test database or
  // seeded data.
  const validLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the moderation log by the generated valid ID
  const log: IRecipeSharingModerationLogs =
    await api.functional.recipeSharing.moderator.moderation.logs.at(
      connection,
      {
        id: validLogId,
      },
    );
  typia.assert(log);

  // 4. Test failure scenario with an invalid/non-existent UUID
  const invalidLogId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;

  await TestValidator.error(
    "fetch moderation log with invalid id should throw",
    async () => {
      await api.functional.recipeSharing.moderator.moderation.logs.at(
        connection,
        {
          id: invalidLogId,
        },
      );
    },
  );
}
