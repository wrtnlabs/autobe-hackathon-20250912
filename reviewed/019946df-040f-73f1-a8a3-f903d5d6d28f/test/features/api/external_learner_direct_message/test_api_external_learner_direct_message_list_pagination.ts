import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsDirectMessage";

/**
 * End-to-end test for retrieving and verifying paginated filtered direct
 * messages as an external learner.
 *
 * This test performs the following steps:
 *
 * 1. Creates a new external learner user with realistic tenant association and
 *    authentication.
 * 2. Calls the PATCH /enterpriseLms/externalLearner/directMessages endpoint
 *    with a filter including tenant_id and pagination parameters.
 * 3. Verifies the returned pagination metadata and that each direct message
 *    summary matches the filter constraints.
 * 4. Tests unauthorized access returns proper errors.
 *
 * The test ensures strict compliance with DTO formats, validates runtime
 * types using typia.assert(), and employs descriptive TestValidator
 * assertions. This robust test guarantees tenant isolation and proper
 * access control for the external learner role.
 */
export async function test_api_external_learner_direct_message_list_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new external learner to obtain authenticated session
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64), // Assuming a secure hash length
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorizedUser: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(authorizedUser);

  // Step 2: Construct request body for filtered, paginated direct message list
  // Use tenant_id from authorizedUser, set optional filters undefined, set page and limit with safe values
  const filterBody = {
    tenant_id: authorizedUser.tenant_id,
    sender_id: undefined,
    recipient_id: undefined,
    body: undefined,
    sent_at_start: undefined,
    sent_at_end: undefined,
    page: 1,
    limit: 10,
  } satisfies IEnterpriseLmsDirectMessage.IRequest;

  // Step 3: Call the paginated direct message list API
  const directMessagePage: IPageIEnterpriseLmsDirectMessage.ISummary =
    await api.functional.enterpriseLms.externalLearner.directMessages.index(
      connection,
      { body: filterBody },
    );
  typia.assert(directMessagePage);

  // Validate pagination info properties
  const pagination = directMessagePage.pagination;
  TestValidator.predicate(
    "pagination.current is positive integer",
    Number.isInteger(pagination.current) && pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive integer",
    Number.isInteger(pagination.limit) && pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is positive integer",
    Number.isInteger(pagination.pages) && pagination.pages > 0,
  );

  // Validate each direct message individual summary matches basic shape and tenant_id
  for (const msg of directMessagePage.data) {
    typia.assert(msg);
    TestValidator.equals(
      "direct message tenant_id matches",
      msg.tenant_id,
      authorizedUser.tenant_id,
    );
    TestValidator.predicate(
      "direct message sent_at is valid ISO string",
      typeof msg.sent_at === "string" && !isNaN(Date.parse(msg.sent_at)),
    );
    if (msg.read_at !== null && msg.read_at !== undefined) {
      TestValidator.predicate(
        "direct message read_at is valid ISO string or null",
        typeof msg.read_at === "string" && !isNaN(Date.parse(msg.read_at)),
      );
    }
  }

  // Step 4: Check unauthorized access returns an error
  // For that simulate an unauthenticated connection by copying with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.enterpriseLms.externalLearner.directMessages.index(
      unauthConn,
      { body: filterBody },
    );
  });
}
