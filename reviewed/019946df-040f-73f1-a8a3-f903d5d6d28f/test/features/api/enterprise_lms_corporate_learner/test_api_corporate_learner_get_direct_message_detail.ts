import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";

export async function test_api_corporate_learner_get_direct_message_detail(
  connection: api.IConnection,
) {
  // 1. Create new corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user${RandomGenerator.alphaNumeric(5)}@example.com`;
  const password = "Password123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const createBody = {
    tenant_id: tenantId,
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joinResponse: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });
  typia.assert(joinResponse);

  // 2. Login again for token refresh
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loginResponse: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // 3. Use an existing directMessageId from simulation or generate new UUID
  const directMessageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to retrieve the direct message detail
  const messageDetail: IEnterpriseLmsDirectMessage =
    await api.functional.enterpriseLms.corporateLearner.directMessages.at(
      connection,
      {
        directMessageId,
      },
    );
  typia.assert(messageDetail);

  // 5. Validate that the message involves the authenticated user (sender or recipient tenant)
  const userId = joinResponse.id;
  const tenantIdJoined = joinResponse.tenant_id;
  TestValidator.predicate(
    "message sender is sender_id or recipient_id matches user id or tenant id",
    messageDetail.sender_id === userId ||
      messageDetail.recipient_id === userId ||
      messageDetail.tenant_id === tenantIdJoined,
  );

  TestValidator.predicate(
    "message body is non-empty",
    messageDetail.body.length > 0,
  );
  TestValidator.predicate(
    "message sent_at is ISO datetime",
    typeof messageDetail.sent_at === "string" &&
      messageDetail.sent_at.length > 0,
  );
}
