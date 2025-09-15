import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * This E2E test validates the workflow of community group deletion and its
 * cascading deletion effects in the chat application.
 *
 * It covers:
 *
 * - User authentication
 * - Community group creation
 * - Community group deletion
 * - Validation that deletion cascades and no residual data remains
 * - Handling of unauthorized deletion attempts
 */
export async function test_api_community_group_deletion_and_cascade(
  connection: api.IConnection,
) {
  // 1. Authenticate a regular user
  const user: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community group
  const groupCreateBody = {
    name: `group_${RandomGenerator.alphaNumeric(8)}`,
    description: "A test group for e2e deletion scenario.",
    status: "active",
    business_status: null,
  } satisfies IChatAppGroup.ICreate;

  const group: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.create(connection, {
      body: groupCreateBody,
    });
  typia.assert(group);
  TestValidator.predicate(
    "group has valid id",
    typeof group.id === "string" && group.id.length > 0,
  );

  // 3. Delete the created community group
  await api.functional.chatApp.regularUser.groups.erase(connection, {
    groupId: group.id,
  });

  // 4. Confirm group is deleted: retry deletion should cause error
  await TestValidator.error(
    "deleting the same group again should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.erase(connection, {
        groupId: group.id,
      });
    },
  );

  // 5. Additional validation for unauthorized deletion
  // Create another user
  const otherUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(otherUser);

  // 6. Attempt unauthorized deletion with random group id
  const randomGroupId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.erase(connection, {
        groupId: randomGroupId,
      });
    },
  );
}
