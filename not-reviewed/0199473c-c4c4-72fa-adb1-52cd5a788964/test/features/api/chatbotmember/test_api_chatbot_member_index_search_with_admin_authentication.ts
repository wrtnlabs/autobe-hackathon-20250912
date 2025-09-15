import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotMember";

/**
 * Validates admin search on chatbot members.
 *
 * This comprehensive E2E test performs the following steps:
 *
 * 1. Registers an admin user with unique internal_sender_id and nickname.
 * 2. Logs in as the admin using the same credentials.
 * 3. Uses the authenticated admin connection to search chatbot members,
 *    filtering by the admin's own internal_sender_id to check correctness.
 * 4. Validates that the returned list only contains members matching the
 *    filter.
 * 5. Asserts pagination information consistency.
 */
export async function test_api_chatbot_member_index_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const internalSenderId = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name();
  const joinBody = {
    internal_sender_id: internalSenderId,
    nickname,
  } satisfies IChatbotAdmin.ICreate;
  const joinResponse: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResponse);

  // 2. Login as the admin
  const loginBody = {
    internal_sender_id: internalSenderId,
    nickname,
  } satisfies IChatbotAdmin.ILogin;
  const loginResponse: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginResponse);

  // 3. Use authenticated connection to search chatbot members with filter
  const searchFilter = {
    internal_sender_id: internalSenderId,
    page: 1,
    limit: 10,
  } satisfies IChatbotMember.IRequest;
  const membersPage: IPageIChatbotMember.ISummary =
    await api.functional.chatbot.admin.chatbotMembers.index(connection, {
      body: searchFilter,
    });
  typia.assert(membersPage);

  // 4. Validate that all returned members match the internal_sender_id filter
  if (membersPage.data.length > 0) {
    for (const member of membersPage.data) {
      TestValidator.equals(
        "member internal_sender_id matches filter",
        member.internal_sender_id,
        internalSenderId,
      );
    }
  }

  // 5. Validate pagination fields are non-negative numbers and coherent
  const pagination = membersPage.pagination;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current is within pages",
    pagination.current <= pagination.pages || pagination.pages === 0,
    true,
  );
}
