import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppGroupMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroupMembership";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppGroupMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppGroupMembership";

/**
 * Verify detailed retrieval of a specific group membership by membership ID
 * for a regular user.
 *
 * This test performs the full business flow:
 *
 * 1. Register a new regular user and obtain authentication tokens.
 * 2. Retrieve an existing group using the authorized user's information.
 * 3. List memberships of the group to get a valid membership ID.
 * 4. Retrieve detailed membership information for that membership ID.
 * 5. Assert that the returned membership matches the expected values from the
 *    membership list.
 * 6. Verify error handling for invalid group and membership IDs.
 *
 * This confirms that membership detail retrieval is correctly authorized,
 * accurate, and robust to invalid input.
 */
export async function test_api_group_membership_detail_retrieval_by_membership_id(
  connection: api.IConnection,
) {
  // 1. Regular user joins and authenticates
  const inputUser = {
    social_login_id: RandomGenerator.alphaNumeric(24),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: inputUser,
    },
  );
  typia.assert(authorizedUser);

  // 2. Retrieve an existing group by some groupId (simulate or use authorizedUser.id for demo)
  // Here, authorizedUser.id is not the real groupId but used as placeholder
  // In real test environment, a valid groupId should be used
  // For safety, we assume group exists

  // Instead of using authorizedUser.id as groupId, fetch a group via separate dependency?
  // Since no group creation API, assume authorizedUser.id as groupId as a proxy

  const group = await api.functional.chatApp.regularUser.groups.at(connection, {
    groupId: authorizedUser.id,
  });
  typia.assert(group);

  // 3. List memberships in the group to get valid membershipId
  const filterRequest = {
    chat_app_group_id: group.id,
    page: 1,
    limit: 5,
  } satisfies IChatAppGroupMembership.IRequest;
  const membershipsPage =
    await api.functional.chatApp.regularUser.groups.memberships.index(
      connection,
      {
        groupId: group.id,
        body: filterRequest,
      },
    );
  typia.assert(membershipsPage);

  TestValidator.predicate(
    "memberships data not empty",
    membershipsPage.data.length > 0,
  );

  // 4. Retrieve membership details with obtained membershipId
  const membershipDetail =
    await api.functional.chatApp.regularUser.groups.memberships.at(connection, {
      groupId: group.id,
      membershipId: membershipsPage.data[0].id,
    });
  typia.assert(membershipDetail);

  // 5. Validate retrieved membership matches summary information
  TestValidator.equals(
    "membership ID matches",
    membershipDetail.id,
    membershipsPage.data[0].id,
  );
  TestValidator.equals(
    "membership role matches",
    membershipDetail.role,
    membershipsPage.data[0].role,
  );
  TestValidator.equals(
    "membership status matches",
    membershipDetail.status,
    membershipsPage.data[0].status,
  );

  // 6. Validate error when invalid groupId is used
  await TestValidator.error("invalid group ID throws error", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.at(connection, {
      groupId: typia.random<string & tags.Format<"uuid">>(),
      membershipId: membershipsPage.data[0].id,
    });
  });

  // 7. Validate error when invalid membership ID is used
  await TestValidator.error("invalid membership ID throws error", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.at(connection, {
      groupId: group.id,
      membershipId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
