import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";

/**
 * This E2E test scenario validates the update of a direct message by an
 * authenticated corporate learner, ensuring that the LMS system properly
 * handles message editing, security, and tenant isolation.
 *
 * The test proceeds as follows:
 *
 * 1. Register a new corporate learner with unique tenant and email.
 * 2. Log in to obtain a fresh authenticated session.
 * 3. Prepare an initial direct message object, mimicking creation due to lack of
 *    create API.
 * 4. Perform an update to the message's body and read timestamp via the designated
 *    API.
 * 5. Verify the update response matches expected changes and retains identifiers.
 * 6. Test error scenarios for invalid id, unauthenticated access, and invalid
 *    input data.
 *
 * This ensures the messaging update API meets business, security, and data
 * consistency requirements.
 */
export async function test_api_direct_message_update_by_authenticated_corporate_learner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as corporate learner
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string = `${RandomGenerator.name(1).toLowerCase()}@company.com`;
  const password: string = "strong_password_123";

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner = await api.functional.auth.corporateLearner.join(
    connection,
    { body: createBody },
  );
  typia.assert(corporateLearner);

  // 2. Login again to refresh auth context
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedInLearner = await api.functional.auth.corporateLearner.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInLearner);

  // 3. Prepare a direct message to update
  // Since no create direct message API, we create an initial message via random
  const initialDirectMessage: IEnterpriseLmsDirectMessage = {
    id: typia.random<string & tags.Format<"uuid">>(),
    tenant_id: tenantId,
    sender_id: corporateLearner.id,
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    body: "Initial message content",
    sent_at: new Date().toISOString(),
    read_at: null,
    deleted_at: null,
  };
  typia.assert(initialDirectMessage);

  // 4. Update the direct message
  const updatedBody = "Updated message content";
  const updatedReadAt = new Date().toISOString();

  const updateRequestBody = {
    body: updatedBody,
    read_at: updatedReadAt,
    deleted_at: null,
  } satisfies IEnterpriseLmsDirectMessage.IUpdate;

  const updatedDirectMessage =
    await api.functional.enterpriseLms.corporateLearner.directMessages.updateDirectMessage(
      connection,
      {
        directMessageId: initialDirectMessage.id,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedDirectMessage);

  TestValidator.equals(
    "directMessage id unchanged after update",
    updatedDirectMessage.id,
    initialDirectMessage.id,
  );
  TestValidator.equals(
    "tenant_id matches after update",
    updatedDirectMessage.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "sender_id matches after update",
    updatedDirectMessage.sender_id,
    corporateLearner.id,
  );
  TestValidator.equals(
    "recipient_id unchanged after update",
    updatedDirectMessage.recipient_id,
    initialDirectMessage.recipient_id,
  );
  TestValidator.equals(
    "message body updated correctly",
    updatedDirectMessage.body,
    updatedBody,
  );
  TestValidator.equals(
    "read_at updated correctly",
    updatedDirectMessage.read_at,
    updatedReadAt,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedDirectMessage.deleted_at,
    null,
  );

  // 5. Error scenarios
  // Attempt updating with invalid directMessageId
  await TestValidator.error(
    "should throw error on invalid directMessageId",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.updateDirectMessage(
        connection,
        {
          directMessageId: "00000000-0000-0000-0000-000000000000", // non-existent UUID
          body: updateRequestBody,
        },
      );
    },
  );

  // Attempt updating without authentication (simulate by creating unauth connection with empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should throw unauthorized error without authentication",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.updateDirectMessage(
        unauthConnection,
        {
          directMessageId: initialDirectMessage.id,
          body: updateRequestBody,
        },
      );
    },
  );

  // Attempt updating with empty body string
  const emptyBodyUpdate = {
    body: "",
    read_at: null,
    deleted_at: null,
  } satisfies IEnterpriseLmsDirectMessage.IUpdate;
  await TestValidator.error(
    "should throw error on empty message body",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.updateDirectMessage(
        connection,
        {
          directMessageId: initialDirectMessage.id,
          body: emptyBodyUpdate,
        },
      );
    },
  );
}
