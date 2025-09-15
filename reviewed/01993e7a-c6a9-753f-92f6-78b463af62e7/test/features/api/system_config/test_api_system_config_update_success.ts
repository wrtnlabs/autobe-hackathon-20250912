import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

export async function test_api_system_config_update_success(
  connection: api.IConnection,
) {
  // 1. Moderator joins and authenticates
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash: string = RandomGenerator.alphaNumeric(64); // simulate a hash
  const moderatorUsername: string = RandomGenerator.name(2);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Prepare update data for system config
  const idToUpdate: string = typia.random<string & tags.Format<"uuid">>();
  const newValue: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const newDescription: string | null = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });

  // 3. Perform the update
  const updatedConfig: IRecipeSharingSystemConfig =
    await api.functional.recipeSharing.moderator.systemConfig.update(
      connection,
      {
        id: idToUpdate,
        body: {
          value: newValue,
          description: newDescription,
        } satisfies IRecipeSharingSystemConfig.IUpdate,
      },
    );
  typia.assert(updatedConfig);

  // 4. Verify updated fields
  TestValidator.equals("updated value matches", updatedConfig.value, newValue);
  TestValidator.equals(
    "updated description matches",
    updatedConfig.description,
    newDescription,
  );

  // 5. Verify timestamps are ISO strings
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    typeof updatedConfig.created_at === "string" &&
      !Number.isNaN(Date.parse(updatedConfig.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    typeof updatedConfig.updated_at === "string" &&
      !Number.isNaN(Date.parse(updatedConfig.updated_at)),
  );
}
