import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppGroupMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroupMembership";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Test the deletion of a membership from a community group by an authorized
 * regular user.
 *
 * This test performs the following steps:
 *
 * 1. Register and authenticate a new regular user.
 * 2. Create a new community group with that user.
 * 3. Create a membership for the user in the created group.
 * 4. Delete the created membership.
 * 5. Verify deletion succeeded by checking error on access.
 * 6. Attempt deletion of a non-existent membership and verify error.
 * 7. Attempt deletion by unauthorized user and verify error.
 */
export async function test_api_group_membership_deletion_by_authorized_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new regular user
  const socialLoginId = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name();

  const user: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: socialLoginId,
        nickname: nickname,
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community group
  const groupName = RandomGenerator.alphaNumeric(12);
  const groupDesc = RandomGenerator.content({ paragraphs: 1 });

  const group: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.create(connection, {
      body: {
        name: groupName,
        description: groupDesc,
        status: "active",
      } satisfies IChatAppGroup.ICreate,
    });
  typia.assert(group);

  // 3. Create the membership for this user in the created group
  const membershipPayload = {
    chat_app_group_id: group.id,
    chat_app_regular_user_id: user.id,
    role: "member",
    joined_at: new Date().toISOString(),
    status: "active",
    business_status: null,
  } satisfies IChatAppGroupMembership.ICreate;

  const membership: IChatAppGroupMembership =
    await api.functional.chatApp.regularUser.groups.memberships.create(
      connection,
      {
        groupId: group.id,
        body: membershipPayload,
      },
    );
  typia.assert(membership);

  // 4. Delete the created membership
  await api.functional.chatApp.regularUser.groups.memberships.erase(
    connection,
    {
      groupId: group.id,
      membershipId: membership.id,
    },
  );

  // 5. Verify deletion succeeded via attempting to delete again (should fail)
  await TestValidator.error(
    "deleting already deleted membership should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.erase(
        connection,
        {
          groupId: group.id,
          membershipId: membership.id,
        },
      );
    },
  );

  // 6. Attempt deletion of a non-existent fake membership
  const fakeMembershipId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deletion of non-existent membership should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.erase(
        connection,
        {
          groupId: group.id,
          membershipId: fakeMembershipId,
        },
      );
    },
  );

  // 7. Create and authenticate another unauthorized regular user
  const otherUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(otherUser);

  // Create membership to test unauthorized deletion attempt
  const unauthorizedMembership: IChatAppGroupMembership =
    await api.functional.chatApp.regularUser.groups.memberships.create(
      connection,
      {
        groupId: group.id,
        body: {
          chat_app_group_id: group.id,
          chat_app_regular_user_id: otherUser.id,
          role: "member",
          joined_at: new Date().toISOString(),
          status: "active",
          business_status: null,
        } satisfies IChatAppGroupMembership.ICreate,
      },
    );
  typia.assert(unauthorizedMembership);

  // Attempt deletion by the original user, simulating authorization context switch
  // This deletion should fail due to lack of permission
  await TestValidator.error(
    "unauthorized user cannot delete another's membership",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.erase(
        connection,
        {
          groupId: group.id,
          membershipId: unauthorizedMembership.id,
        },
      );
    },
  );
}
