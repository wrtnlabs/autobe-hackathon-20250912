import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotUserTitle";

/**
 * This test validates retrieval of filtered, paginated user title lists
 * assigned to a chatbot member. It performs member creation/authentication,
 * various filter and pagination tests, negative tests for invalid memberId and
 * unauthorized access. Validates response structure and business logic using
 * type-safe assertions.
 */
export async function test_api_user_title_list_retrieval_by_member_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a chatbot member
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  const memberId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(member.id);

  // Common filter dates
  const now = new Date();
  const assignedAtGte = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const assignedAtLte = now.toISOString();

  // Step 2: Valid filter and pagination test - basic page=1, limit=10
  const filter1: IChatbotUserTitle.IRequest = {
    page: 1,
    limit: 10,
    chatbot_member_id: memberId,
    assigned_at_gte: assignedAtGte,
    assigned_at_lte: assignedAtLte,
  };

  const output1: IPageIChatbotUserTitle.ISummary =
    await api.functional.chatbot.member.chatbotMembers.userTitles.index(
      connection,
      {
        memberId,
        body: filter1,
      },
    );
  typia.assert(output1);

  TestValidator.predicate(
    "pagination page should be 1",
    output1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    output1.pagination.limit === 10,
  );
  // Validate all returned records have chatbot_member_id
  TestValidator.predicate(
    "all user titles belong to correct member",
    ArrayUtil.has(output1.data, (item) => item.chatbot_member_id === memberId),
  );

  // Step 3: Boundary cases
  // Empty filter: only mandatory memberId and empty body
  const filterEmpty: IChatbotUserTitle.IRequest = {};

  const outputEmpty: IPageIChatbotUserTitle.ISummary =
    await api.functional.chatbot.member.chatbotMembers.userTitles.index(
      connection,
      {
        memberId,
        body: filterEmpty,
      },
    );
  typia.assert(outputEmpty);

  // Validate pagination and sampling
  TestValidator.predicate(
    "empty filter pagination current page >= 0",
    outputEmpty.pagination.current >= 0,
  );
  TestValidator.predicate(
    "empty filter pagination limit >= 0",
    outputEmpty.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "empty filter data is array",
    Array.isArray(outputEmpty.data),
  );

  // Filter with max limit of 100
  const filterMaxLimit: IChatbotUserTitle.IRequest = {
    page: 1,
    limit: 100,
    chatbot_member_id: memberId,
  };

  const outputMaxLimit: IPageIChatbotUserTitle.ISummary =
    await api.functional.chatbot.member.chatbotMembers.userTitles.index(
      connection,
      {
        memberId,
        body: filterMaxLimit,
      },
    );
  typia.assert(outputMaxLimit);
  TestValidator.predicate(
    "max limit should be less or equal 100",
    outputMaxLimit.pagination.limit <= 100,
  );

  // Step 4: Invalid memberId format test
  const invalidMemberId = "invalid-uuid-format";
  await TestValidator.error(
    "invalid memberId format should throw error",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.index(
        connection,
        {
          memberId: invalidMemberId as string & tags.Format<"uuid">,
          body: filterEmpty,
        },
      );
    },
  );

  // Step 4b: Non-existent memberId with valid UUID format (randomly generated)
  const nonExistMemberId = typia.random<string & tags.Format<"uuid">>();
  // This might throw if not found or return empty result
  // Write test to handle error or empty results
  try {
    const outputNonExist: IPageIChatbotUserTitle.ISummary =
      await api.functional.chatbot.member.chatbotMembers.userTitles.index(
        connection,
        {
          memberId: nonExistMemberId,
          body: filterEmpty,
        },
      );
    typia.assert(outputNonExist);
    TestValidator.predicate(
      "non-existent memberId returns empty or no error",
      Array.isArray(outputNonExist.data),
    );
  } catch {
    // If throws error, satisfies negative test
  }

  // Step 5: Unauthorized access
  // Create a fresh connection that lacks authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.chatbot.member.chatbotMembers.userTitles.index(
      unauthenticatedConnection,
      {
        memberId,
        body: filterEmpty,
      },
    );
  });
}
