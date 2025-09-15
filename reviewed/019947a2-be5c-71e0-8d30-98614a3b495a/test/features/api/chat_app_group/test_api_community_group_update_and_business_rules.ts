import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * End-to-end test for community group update with enforcement of uniqueness
 * constraints and authorization rules.
 *
 * Workflow:
 *
 * 1. Authenticate a regular user (User A).
 * 2. Create an initial community group under User A.
 * 3. Update this group with new values (name, description, status,
 *    business_status).
 * 4. Validate the returned updated group reflects the changes correctly.
 * 5. Authenticate a second regular user (User B).
 * 6. Attempt to update the first user's group with User B's credentials,
 *    expecting failure due to unauthorized access.
 * 7. Authenticate User A again.
 * 8. Create a second community group under User A, with a unique name.
 * 9. Attempt to update the first group to have the second group's name,
 *    expecting failure due to name uniqueness violation.
 *
 * This tests correct application of business rules and proper error
 * handling.
 */
export async function test_api_community_group_update_and_business_rules(
  connection: api.IConnection,
) {
  // 1. Authenticate User A
  const userACreateBody = {
    social_login_id: `regular_user_a_${Date.now()}`,
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const userA: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userACreateBody,
    });
  typia.assert(userA);

  // 2. Create a community group as User A
  const initialGroupCreateBody = {
    name: `InitialGroup_${Date.now()}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    business_status: "normal",
  } satisfies IChatAppGroup.ICreate;
  const initialGroup: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.create(connection, {
      body: initialGroupCreateBody,
    });
  typia.assert(initialGroup);

  // 3. Update this community group with new details
  const updateGroupBody = {
    name: `UpdatedGroup_${Date.now()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "inactive",
    business_status: "pending",
  } satisfies IChatAppGroup.IUpdate;

  const updatedGroup: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.update(connection, {
      groupId: initialGroup.id,
      body: updateGroupBody,
    });
  typia.assert(updatedGroup);

  // 4. Validate that the updated group data matches the changes
  TestValidator.equals(
    "group ID unchanged after update",
    updatedGroup.id,
    initialGroup.id,
  );
  TestValidator.equals(
    "group name updated correctly",
    updatedGroup.name,
    updateGroupBody.name!,
  );
  TestValidator.equals(
    "group description updated correctly",
    updatedGroup.description ?? null,
    updateGroupBody.description ?? null,
  );
  TestValidator.equals(
    "group status updated correctly",
    updatedGroup.status,
    updateGroupBody.status!,
  );
  TestValidator.equals(
    "group business status updated correctly",
    updatedGroup.business_status ?? null,
    updateGroupBody.business_status ?? null,
  );

  // 5. Authenticate User B (second user)
  const userBCreateBody = {
    social_login_id: `regular_user_b_${Date.now()}`,
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const userB: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userBCreateBody,
    });
  typia.assert(userB);

  // 6. Attempt to update User A's group using User B's authentication
  // Prepare unauthorized update body
  const unauthorizedUpdateBody = {
    name: `UserBUpdate_${Date.now()}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    business_status: "normal",
  } satisfies IChatAppGroup.IUpdate;

  await TestValidator.error(
    "unauthorized user cannot update other user's group",
    async () => {
      await api.functional.chatApp.regularUser.groups.update(connection, {
        groupId: initialGroup.id,
        body: unauthorizedUpdateBody,
      });
    },
  );

  // 7. Authenticate User A again to restore update privilege
  const userALoginBody = {
    social_login_id: userA.social_login_id,
    nickname: userA.nickname,
    profile_image_uri: userA.profile_image_uri,
  } satisfies IChatAppRegularUser.ICreate;
  const userA2: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userALoginBody,
    });
  typia.assert(userA2);

  // 8. Create a second group under User A with a unique name
  const secondGroupCreateBody = {
    name: `SecondGroup_${Date.now()}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    business_status: "normal",
  } satisfies IChatAppGroup.ICreate;
  const secondGroup: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.create(connection, {
      body: secondGroupCreateBody,
    });
  typia.assert(secondGroup);

  // 9. Attempt to update the first group to have the name of the second group (should fail due to uniqueness conflict)
  const conflictUpdateBody = {
    name: secondGroup.name, // duplicate name
  } satisfies IChatAppGroup.IUpdate;

  await TestValidator.error(
    "updating group name to an existing group name should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.update(connection, {
        groupId: initialGroup.id,
        body: conflictUpdateBody,
      });
    },
  );
}
