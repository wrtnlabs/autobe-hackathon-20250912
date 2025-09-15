import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";

/**
 * Test the flow of sending direct messages by an authenticated corporate
 * learner.
 *
 * This test covers:
 *
 * 1. Registration and login of a corporate learner (sender).
 * 2. Creation of a second corporate learner (recipient) for messaging.
 * 3. Sending a message with valid data including tenant context, sender and
 *    recipient information.
 * 4. Validation of message response structure and content.
 * 5. Testing failure cases with invalid sender/recipient IDs and missing
 *    message body.
 * 6. Ensuring unauthorized sessions cannot send messages.
 */
export async function test_api_direct_message_sending_by_authenticated_corporate_learner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the sender corporate learner
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const senderEmail = `${RandomGenerator.name(1).replace(/\s/g, ".").toLowerCase()}@example.com`;
  const senderPassword = "StrongP@ssword123";
  const senderFirstName = RandomGenerator.name(1).split(" ")[0];
  const senderLastName = RandomGenerator.name(1).split(" ")[0];

  const senderAuthorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: senderEmail,
        password: senderPassword,
        first_name: senderFirstName,
        last_name: senderLastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(senderAuthorized);

  // 2. Login the sender corporate learner
  const loginResponse: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email: senderEmail,
        password: senderPassword,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(loginResponse);

  // Verify that the tenant_id from authorized matches the created tenant_id
  TestValidator.equals(
    "tenantId matches after login",
    loginResponse.tenant_id,
    tenantId,
  );

  // 3. Register the recipient corporate learner (on the same tenant)
  const recipientEmail = `${RandomGenerator.name(1).replace(/\s/g, ".").toLowerCase()}@example.net`;
  const recipientPassword = "StrongP@ssword123";
  const recipientFirstName = RandomGenerator.name(1).split(" ")[0];
  const recipientLastName = RandomGenerator.name(1).split(" ")[0];
  const recipientAuthorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: recipientEmail,
        password: recipientPassword,
        first_name: recipientFirstName,
        last_name: recipientLastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(recipientAuthorized);

  // 4. Compose the message payload
  const messageBody = "Hello, this is a test direct message.";
  const sentAt = new Date().toISOString();

  const messageCreate: IEnterpriseLmsDirectMessage.ICreate = {
    tenant_id: tenantId,
    sender_id: senderAuthorized.id,
    recipient_id: recipientAuthorized.id,
    body: messageBody,
    sent_at: sentAt,
  } satisfies IEnterpriseLmsDirectMessage.ICreate;

  // 5. Send the direct message by the authenticated sender
  const sentMessage: IEnterpriseLmsDirectMessage =
    await api.functional.enterpriseLms.corporateLearner.directMessages.create(
      connection,
      { body: messageCreate },
    );
  typia.assert(sentMessage);

  // Validate the sent message matches the created data
  TestValidator.equals(
    "sent message tenant_id",
    sentMessage.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "sent message sender_id",
    sentMessage.sender_id,
    senderAuthorized.id,
  );
  TestValidator.equals(
    "sent message recipient_id",
    sentMessage.recipient_id,
    recipientAuthorized.id,
  );
  TestValidator.equals("sent message body", sentMessage.body, messageBody);
  TestValidator.predicate(
    "sent message id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sentMessage.id,
    ),
  );
  TestValidator.equals("sent message sent_at", sentMessage.sent_at, sentAt);

  // 6. Error cases

  // 6.1 Invalid sender_id
  await TestValidator.error(
    "send message fails with invalid sender id",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.create(
        connection,
        {
          body: {
            ...messageCreate,
            sender_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 6.2 Invalid recipient_id
  await TestValidator.error(
    "send message fails with invalid recipient id",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.create(
        connection,
        {
          body: {
            ...messageCreate,
            recipient_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 6.3 Empty message body
  await TestValidator.error("send message fails with empty body", async () => {
    await api.functional.enterpriseLms.corporateLearner.directMessages.create(
      connection,
      {
        body: {
          ...messageCreate,
          body: "",
        },
      },
    );
  });

  // 6.4 Unauthorized (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "send message fails without authentication",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.create(
        unauthenticatedConnection,
        { body: messageCreate },
      );
    },
  );
}
