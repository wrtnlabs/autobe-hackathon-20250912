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

export async function test_api_group_membership_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const userCreateBody = {
    social_login_id: `snapchat_${RandomGenerator.alphaNumeric(8)}`,
    nickname: RandomGenerator.name(2),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Assume an existing community group by generating a valid UUID
  const groupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare request body for membership search with filters and pagination
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago

  const membershipSearchBody = {
    chat_app_group_id: groupId,
    role: "member",
    status: "active",
    business_status: null,
    joined_after: pastDate.toISOString(),
    joined_before: now.toISOString(),
    page: 1,
    limit: 10,
    order_by: "joined_at",
    order_direction: "asc",
  } satisfies IChatAppGroupMembership.IRequest;

  // 4. Query membership list with filters and pagination
  const membershipPage: IPageIChatAppGroupMembership.ISummary =
    await api.functional.chatApp.regularUser.groups.memberships.index(
      connection,
      {
        groupId,
        body: membershipSearchBody,
      },
    );
  typia.assert(membershipPage);

  // 5. Validate pagination info
  const pagination: IPage.IPagination = membershipPage.pagination;
  TestValidator.predicate(
    "pagination current page is valid",
    pagination.current === membershipSearchBody.page!,
  );
  TestValidator.predicate(
    "pagination limit equals request limit",
    pagination.limit === membershipSearchBody.limit!,
  );

  // 6. Validate each membership summary matches filter criteria
  for (const membership of membershipPage.data) {
    typia.assert(membership);
    TestValidator.predicate(
      "membership role matches filter",
      membership.role === membershipSearchBody.role!,
    );
    TestValidator.predicate(
      "membership status matches filter",
      membership.status === membershipSearchBody.status!,
    );
    if (
      membership.business_status !== undefined &&
      membership.business_status !== null
    ) {
      TestValidator.equals(
        "membership business status matches filter",
        membership.business_status,
        membershipSearchBody.business_status,
      );
    }
    TestValidator.predicate(
      "membership joined_at after joined_after",
      membership.joined_at >= membershipSearchBody.joined_after!,
    );
    TestValidator.predicate(
      "membership joined_at before joined_before",
      membership.joined_at <= membershipSearchBody.joined_before!,
    );
  }

  // 7. Negative test: Check filtering with invalid page value triggers error
  await TestValidator.error("invalid page number triggers error", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.index(
      connection,
      {
        groupId,
        body: {
          ...membershipSearchBody,
          page: 0,
        },
      },
    );
  });

  // 8. Negative test: Unauthorized access with invalid groupId should trigger error
  await TestValidator.error("unauthorized access triggers error", async () => {
    await api.functional.chatApp.regularUser.groups.memberships.index(
      connection,
      {
        groupId: typia.random<string & tags.Format<"uuid">>(),
        body: membershipSearchBody,
      },
    );
  });
}
