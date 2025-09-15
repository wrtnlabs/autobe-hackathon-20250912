import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppGroup";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Test the community group creation API for a regular authenticated user.
 *
 * This test performs the following steps:
 *
 * 1. Create and authenticate a new regular user with unique social login ID
 *    and nickname.
 * 2. Create a new community group with a unique name, optional null
 *    description, and mandatory status.
 * 3. Validate the returned group object for correctness including uuid id and
 *    timestamps.
 * 4. Attempt to create a duplicate group with the same name and expect
 *    failure.
 *
 * This test verifies business rules like unique group names and ensures
 * that the group creation endpoint is secure and behaves correctly with
 * valid and duplicate data.
 *
 * Authentication token handling is managed by the SDK internally.
 */
export async function test_api_community_group_creation_and_validation(
  connection: api.IConnection,
) {
  // 1. Authenticate and create a new regular user
  const socialLoginId = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name();
  const userCreateBody = {
    social_login_id: socialLoginId,
    nickname: nickname,
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const user: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Create a unique community group
  const groupName = `group_${RandomGenerator.alphaNumeric(12)}`;
  const groupCreateBody = {
    name: groupName,
    description: null,
    status: "active",
    business_status: null,
  } satisfies IChatAppGroup.ICreate;

  const group: IChatAppGroup =
    await api.functional.chatApp.regularUser.groups.create(connection, {
      body: groupCreateBody,
    });
  typia.assert(group);

  // 3. Validate group properties
  TestValidator.predicate(
    "group id should be a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      group.id,
    ),
  );

  TestValidator.equals("group name matches", group.name, groupCreateBody.name);
  TestValidator.equals(
    "group description matches",
    group.description,
    groupCreateBody.description,
  );
  TestValidator.equals("group status matches", group.status, "active");
  TestValidator.equals(
    "group business_status matches",
    group.business_status,
    groupCreateBody.business_status,
  );
  TestValidator.predicate(
    "created_at is a date-time string",
    typeof group.created_at === "string" && group.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a date-time string",
    typeof group.updated_at === "string" && group.updated_at.length > 0,
  );

  // 4. Attempt to create duplicate group with same name -> expect failure
  await TestValidator.error("duplicate group name should fail", async () => {
    await api.functional.chatApp.regularUser.groups.create(connection, {
      body: {
        name: groupName,
        description: "Duplicate",
        status: "active",
        business_status: null,
      } satisfies IChatAppGroup.ICreate,
    });
  });
}
