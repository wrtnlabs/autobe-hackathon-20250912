import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsDirectMessage";

/**
 * This E2E test validates retrieval of filtered and paginated direct
 * messages for a corporate learner.
 *
 * It performs user creation via join and login endpoints with realistic
 * data, then retrieves direct messages filtered by tenant, sender,
 * recipient, message body fragment, and sent date range, paginated by page
 * and limit.
 *
 * Validations ensure all returned direct messages match filters and belong
 * to the tenant, pagination meta data is consistent, and unauthorized
 * access is rejected.
 */
export async function test_api_direct_message_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create and join a corporate learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const joined: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login the corporate learner
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Prepare filters for direct message search
  const tenantId = joined.tenant_id;
  // Using the same user as sender and recipient for testing
  const senderId = joined.id;
  const recipientId = joined.id;
  const bodyFragment = "test";

  // 4. Execute the patch request with filters including pagination
  const firstPageRequest = {
    tenant_id: tenantId,
    sender_id: senderId,
    recipient_id: recipientId,
    body: bodyFragment,
    sent_at_start: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(), // 30 days ago
    sent_at_end: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEnterpriseLmsDirectMessage.IRequest;

  const firstPageResponse: IPageIEnterpriseLmsDirectMessage.ISummary =
    await api.functional.enterpriseLms.corporateLearner.directMessages.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(firstPageResponse);

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page 1",
    firstPageResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has limit 10",
    firstPageResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination has non-negative total records",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative total pages",
    firstPageResponse.pagination.pages >= 0,
  );

  // 6. Validate that each message belongs to tenant and matches filters
  for (const message of firstPageResponse.data) {
    typia.assert(message);
    TestValidator.equals(
      "message belongs to tenant",
      message.tenant_id,
      tenantId,
    );
    TestValidator.equals(
      "message sender id matches filter",
      message.sender_id,
      senderId,
    );
    TestValidator.equals(
      "message recipient id matches filter",
      message.recipient_id,
      recipientId,
    );
    TestValidator.predicate(
      "message body contains fragment",
      message.body.includes(bodyFragment),
    );
    // sent_at within range
    TestValidator.predicate(
      "message sent_at in filter range",
      message.sent_at >= firstPageRequest.sent_at_start! &&
        message.sent_at <= firstPageRequest.sent_at_end!,
    );
  }

  // 7. Test pagination: fetch second page if exists
  if (firstPageResponse.pagination.pages > 1) {
    const secondPageRequest = {
      ...firstPageRequest,
      page: 2,
    } satisfies IEnterpriseLmsDirectMessage.IRequest;
    const secondPageResponse =
      await api.functional.enterpriseLms.corporateLearner.directMessages.index(
        connection,
        { body: secondPageRequest },
      );
    typia.assert(secondPageResponse);
    TestValidator.predicate(
      "pagination second page has current page 2",
      secondPageResponse.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page messages differ from first page",
      secondPageResponse.data.length > 0 &&
        secondPageResponse.data[0].id !== firstPageResponse.data[0]?.id,
    );
  }

  // 8. Test unauthorized access: create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access without auth token",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.index(
        unauthenticatedConnection,
        {
          body: firstPageRequest,
        },
      );
    },
  );
}
