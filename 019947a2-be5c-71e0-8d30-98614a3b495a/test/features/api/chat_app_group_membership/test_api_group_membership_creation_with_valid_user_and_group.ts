import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppGroupMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroupMembership";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

export async function test_api_group_membership_creation_with_valid_user_and_group(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const userCreateBody = {
    social_login_id: `snapchat_${RandomGenerator.alphaNumeric(10)}`,
    nickname: RandomGenerator.name(),
  } satisfies IChatAppRegularUser.ICreate;
  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Prepare an existing groupId for testing - random UUID
  const testGroupId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve existing group details using valid groupId
  const group: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.at(connection, {
      groupId: testGroupId,
    });
  typia.assert(group);

  // 4. Create a new membership in the group
  const nowIso = new Date().toISOString();
  const membershipCreateBody = {
    chat_app_group_id: group.id,
    chat_app_regular_user_id: authorizedUser.id,
    role: "member",
    joined_at: nowIso,
    status: "active",
    business_status: null,
  } satisfies IChatAppGroupMembership.ICreate;

  const membership: IChatAppGroupMembership =
    await api.functional.chatApp.regularUser.groups.memberships.create(
      connection,
      {
        groupId: group.id,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership's group ID matches",
    membership.chat_app_group_id,
    group.id,
  );

  TestValidator.equals(
    "membership's user ID matches",
    membership.chat_app_regular_user_id,
    authorizedUser.id,
  );

  TestValidator.equals(
    "membership role is 'member'",
    membership.role,
    "member",
  );

  TestValidator.equals(
    "membership status is 'active'",
    membership.status,
    "active",
  );

  TestValidator.equals(
    "membership joined_at matches request",
    membership.joined_at,
    membershipCreateBody.joined_at,
  );

  // 5. Attempt to create duplicate membership (should fail)
  await TestValidator.error(
    "duplicate membership creation should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.create(
        connection,
        {
          groupId: group.id,
          body: membershipCreateBody,
        },
      );
    },
  );

  // 6. Attempt to create membership without authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "membership creation without auth should fail",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.create(
        unauthenticatedConnection,
        {
          groupId: group.id,
          body: membershipCreateBody,
        },
      );
    },
  );
}
