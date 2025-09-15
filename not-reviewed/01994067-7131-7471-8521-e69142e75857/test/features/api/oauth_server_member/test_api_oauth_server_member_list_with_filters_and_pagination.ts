import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerMember";

/**
 * This test validates the OAuth server member listing endpoint that returns
 * paginated member summaries with filtering by email and verification status.
 * It ensures only authenticated members can access the endpoint, verifies
 * successful filtering and pagination, and checks proper rejection of
 * unauthorized access.
 *
 * The test follows these steps:
 *
 * 1. Create a new member user (join) with a valid email and password.
 * 2. Log in as that member to authenticate the session.
 * 3. Attempt unauthorized access to the listing endpoint (should fail).
 * 4. Call the paginated member list endpoint with filters for email and
 *    email_verified to verify filtering.
 * 5. Validate the response pagination metadata and member data consistency.
 */
export async function test_api_oauth_server_member_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create a new member user (join)
  const memberEmail = `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(3)}@example.com`;
  const memberPassword = "Test1234!";
  const createBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ICreate;
  const joinedMember = await api.functional.auth.member.join(connection, {
    body: createBody,
  });
  typia.assert(joinedMember);

  // 2. Log in as the created member
  const loginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ILogin;
  const loggedInMember = await api.functional.auth.member.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInMember);

  // 3. Attempt unauthorized access with new unauthenticated connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to member list should fail",
    async () => {
      await api.functional.oauthServer.member.oauthServerMembers.index(
        unauthenticatedConn,
        {
          body: { email: memberEmail } satisfies IOauthServerMember.IRequest,
        },
      );
    },
  );

  // 4. Call the paginated member list endpoint with filters
  const pageNum = 1;
  const pageLimit = 5;
  const sortOrder = "asc";
  const filterBody = {
    email: memberEmail,
    email_verified: true,
    page: pageNum satisfies number & tags.Type<"int32">,
    limit: pageLimit satisfies number & tags.Type<"int32">,
    sort: sortOrder,
  } satisfies IOauthServerMember.IRequest;

  const pageResult: IPageIOauthServerMember.ISummary =
    await api.functional.oauthServer.member.oauthServerMembers.index(
      connection,
      {
        body: filterBody,
      },
    );
  typia.assert(pageResult);

  // 5. Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page matches",
    pageResult.pagination.current === pageNum,
  );
  TestValidator.predicate(
    "pagination limit matches",
    pageResult.pagination.limit === pageLimit,
  );
  TestValidator.predicate(
    "pagination page count valid",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pageResult.pagination.records >= 0,
  );

  // 6. Validate member data consistency in the returned page
  for (const memberSummary of pageResult.data) {
    typia.assert(memberSummary);
    TestValidator.predicate(
      "member id is non-empty uuid",
      typeof memberSummary.id === "string" && memberSummary.id.length > 0,
    );
    TestValidator.equals(
      "member email matches filter",
      memberSummary.email,
      memberEmail,
    );
    TestValidator.equals(
      "member email_verified is true",
      memberSummary.email_verified,
      true,
    );
    TestValidator.predicate(
      "member created_at is non-empty string",
      typeof memberSummary.created_at === "string" &&
        memberSummary.created_at.length > 0,
    );
    TestValidator.predicate(
      "member updated_at is non-empty string",
      typeof memberSummary.updated_at === "string" &&
        memberSummary.updated_at.length > 0,
    );
  }
}
