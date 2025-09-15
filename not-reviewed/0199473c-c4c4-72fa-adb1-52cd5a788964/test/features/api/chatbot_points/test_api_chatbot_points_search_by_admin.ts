import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotPoints";

/**
 * This E2E test function validates the whole scenario of chatbot points
 * searching by an admin user. It executes steps from admin and member creation,
 * chatbot points creation for members, authentication role switching, and admin
 * searches. It validates proper filtering, pagination, sorting, authorization,
 * and business logic for points data retrieval.
 *
 * Step-by-step process:
 *
 * 1. Admin joins and logs in.
 * 2. Multiple members join.
 * 3. Chatbot points are created for each member.
 * 4. Admin searches chatbot points with various filters.
 * 5. Results are validated for correctness, filtering, and pagination.
 * 6. Non-admin user tries to access admin endpoint and fails.
 */
export async function test_api_chatbot_points_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminInternalSenderId = RandomGenerator.alphaNumeric(10);
  const adminNickname = RandomGenerator.name();
  const adminCreateBody = {
    internal_sender_id: adminInternalSenderId,
    nickname: adminNickname,
  } satisfies IChatbotAdmin.ICreate;

  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminCreateBody },
  );
  typia.assert(admin);

  // 2. Login as admin to ensure current authenticated context
  const adminLoginBody = {
    internal_sender_id: admin.internal_sender_id,
    nickname: admin.nickname,
  } satisfies IChatbotAdmin.ILogin;
  const loggedAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedAdmin);

  // 3. Create multiple chatbot members and authenticate
  const membersCount = 3;
  const memberInfos: IChatbotMember.IAuthorized[] = [];
  for (let i = 0; i < membersCount; ++i) {
    const memberInternalSenderId = RandomGenerator.alphaNumeric(10);
    const memberNickname = RandomGenerator.name();
    const memberCreateBody = {
      internal_sender_id: memberInternalSenderId,
      nickname: memberNickname,
    } satisfies IChatbotMember.ICreate;

    const member: IChatbotMember.IAuthorized =
      await api.functional.auth.member.join.joinMember(connection, {
        body: memberCreateBody,
      });
    typia.assert(member);
    memberInfos.push(member);
  }

  // 4. Create chatbot points for each member
  const pointsByMemberId: Map<string, IChatbotPoints> = new Map();
  for (const member of memberInfos) {
    // Generate points: random int between 10 and 1000
    const pointsValue = Math.floor(Math.random() * (1000 - 10 + 1)) + 10;

    const pointsCreateBody = {
      chatbot_member_id: member.id,
      points: pointsValue,
    } satisfies IChatbotPoints.ICreate;

    const createdPoints: IChatbotPoints =
      await api.functional.chatbot.member.chatbotPoints.create(connection, {
        body: pointsCreateBody,
      });
    typia.assert(createdPoints);
    pointsByMemberId.set(member.id, createdPoints);
  }

  // 5. Admin searches chatbot points with filtering, pagination, sorting
  // Filter by a single member ID
  const targetMember = memberInfos[0];
  const searchByMemberIdRequest = {
    chatbot_member_id: targetMember.id,
    page: 1,
    limit: 10,
    sort_by: "points",
    sort_direction: "desc",
  } satisfies IChatbotPoints.IRequest;

  const searchByMemberResult: IPageIChatbotPoints =
    await api.functional.chatbot.admin.chatbotPoints.index(connection, {
      body: searchByMemberIdRequest,
    });
  typia.assert(searchByMemberResult);

  TestValidator.predicate(
    "search by member ID returns only points belonging to that member",
    searchByMemberResult.data.every(
      (point) => point.chatbot_member_id === targetMember.id,
    ),
  );

  // Validate that points are sorted descending by points
  TestValidator.predicate(
    "points sorted descending",
    searchByMemberResult.data.every(
      (point, i, array) => i === 0 || point.points <= array[i - 1].points,
    ),
  );

  // Filter by points range (min_points, max_points)
  const minPoints = 100;
  const maxPoints = 900;
  const searchByPointsRangeRequest = {
    min_points: minPoints,
    max_points: maxPoints,
    page: 1,
    limit: 10,
    sort_by: "points",
    sort_direction: "asc",
  } satisfies IChatbotPoints.IRequest;

  const searchByPointsRangeResult: IPageIChatbotPoints =
    await api.functional.chatbot.admin.chatbotPoints.index(connection, {
      body: searchByPointsRangeRequest,
    });
  typia.assert(searchByPointsRangeResult);

  TestValidator.predicate(
    "all points in range",
    searchByPointsRangeResult.data.every(
      (point) => point.points >= minPoints && point.points <= maxPoints,
    ),
  );

  // Validate sorting ascending
  TestValidator.predicate(
    "points sorted ascending",
    searchByPointsRangeResult.data.every(
      (point, i, arr) => i === 0 || point.points >= arr[i - 1].points,
    ),
  );

  // Pagination test - check pagination object properties and consistency
  const pageInfo = searchByPointsRangeResult.pagination;
  TestValidator.predicate(
    "pagination current page is 1",
    pageInfo.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pageInfo.limit === 10);
  TestValidator.predicate(
    "pagination pages and records consistent",
    pageInfo.pages >= 0 && pageInfo.records >= 0,
  );

  // 6. Switch to a member role connection and assert the search endpoint throws
  // unauthorized error or fails
  const memberForErrorTest = memberInfos[1];
  const memberLoginBody = {
    internal_sender_id: memberForErrorTest.internal_sender_id,
    nickname: memberForErrorTest.nickname,
  } satisfies IChatbotMember.ILogin;
  const memberAuth: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuth);

  await TestValidator.error(
    "non-admin member role cannot access admin chatbot points search",
    async () => {
      await api.functional.chatbot.admin.chatbotPoints.index(connection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IChatbotPoints.IRequest,
      });
    },
  );
}
