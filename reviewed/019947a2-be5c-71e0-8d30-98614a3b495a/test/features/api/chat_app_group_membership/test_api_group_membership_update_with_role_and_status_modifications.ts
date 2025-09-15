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
 * This test validates updating membership details in a chat community group.
 *
 * It covers:
 *
 * 1. Registering a regular user and authenticating.
 * 2. Retrieving an existing chat group by ID.
 * 3. Listing group memberships to find a valid membership for update.
 * 4. Performing a valid update to membership role, status, and business status.
 * 5. Validating the update through assertion and equality checks.
 * 6. Testing authorization by attempting update as unauthorized user and verifying
 *    failure.
 * 7. Testing update with invalid IDs and invalid role/status values to check error
 *    handling.
 */
export async function test_api_group_membership_update_with_role_and_status_modifications(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a regular user
  const socialLoginId: string = RandomGenerator.alphaNumeric(10);
  const nickname: string = RandomGenerator.name();
  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: socialLoginId,
        nickname: nickname,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. For testing purposes, we pick a random valid UUID groupId and membershipId
  //    Knowing no provided groupId in scenario, pick realistic random UUIDs
  const groupId: string = typia.random<string & tags.Format<"uuid">>();
  const membershipId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve group details for the picked groupId
  const group: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.at(connection, { groupId });
  typia.assert(group);

  // 4. Query memberships of the group to find available memberships
  const membershipsPage: IPageIChatAppGroupMembership.ISummary =
    await api.functional.chatApp.regularUser.groups.memberships.index(
      connection,
      {
        groupId,
        body: { page: 1, limit: 10 } satisfies IChatAppGroupMembership.IRequest,
      },
    );
  typia.assert(membershipsPage);

  TestValidator.predicate(
    "memberships page data is not empty",
    membershipsPage.data.length > 0,
  );

  // Use the first membership from the page for update target
  const membershipToUpdate = membershipsPage.data[0];
  typia.assert(membershipToUpdate);

  // 5. Perform a successful update on the membership
  const updateBody: IChatAppGroupMembership.IUpdate = {
    role: "admin",
    status: "active",
    business_status: "verified",
  };

  const updatedMembership: IChatAppGroupMembership =
    await api.functional.chatApp.regularUser.groups.memberships.update(
      connection,
      {
        groupId,
        membershipId: membershipToUpdate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMembership);

  TestValidator.equals(
    "membership role updated",
    updatedMembership.role,
    updateBody.role,
  );
  TestValidator.equals(
    "membership status updated",
    updatedMembership.status,
    updateBody.status,
  );
  TestValidator.equals(
    "membership business_status updated",
    updatedMembership.business_status,
    updateBody.business_status,
  );

  // 6. Register and authenticate a second user to simulate unauthorized actions
  const otherSocialLoginId: string = RandomGenerator.alphaNumeric(10);
  const otherNickname: string = RandomGenerator.name();
  const unauthorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: otherSocialLoginId,
        nickname: otherNickname,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(unauthorizedUser);

  // Normally we need to use a different connection with unauthorized user's tokens
  // But since SDK handles tokens internally, simulate by attempting update with same connection
  await TestValidator.error(
    "unauthorized user cannot update membership",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.update(
        connection,
        {
          groupId,
          membershipId: membershipToUpdate.id,
          body: { role: "member" },
        },
      );
    },
  );

  // 7. Test invalid update attempts with wrong role and status values
  await TestValidator.error("update fails with invalid role", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.update(
      connection,
      {
        groupId,
        membershipId: membershipToUpdate.id,
        body: { role: "invalidRole" },
      },
    );
  });

  await TestValidator.error("update fails with invalid status", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.update(
      connection,
      {
        groupId,
        membershipId: membershipToUpdate.id,
        body: { status: "invalidStatus" },
      },
    );
  });

  // 8. Test updates with invalid groupId and membershipId
  await TestValidator.error("update fails with invalid groupId", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.update(
      connection,
      {
        groupId: "00000000-0000-0000-0000-000000000000",
        membershipId: membershipToUpdate.id,
        body: { role: "member" },
      },
    );
  });

  await TestValidator.error(
    "update fails with invalid membershipId",
    async () => {
      await api.functional.chatApp.regularUser.groups.memberships.update(
        connection,
        {
          groupId,
          membershipId: "00000000-0000-0000-0000-000000000000",
          body: { role: "member" },
        },
      );
    },
  );
}
