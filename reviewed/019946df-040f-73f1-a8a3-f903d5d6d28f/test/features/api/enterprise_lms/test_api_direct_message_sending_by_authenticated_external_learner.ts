import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_direct_message_sending_by_authenticated_external_learner(
  connection: api.IConnection,
) {
  // 1. Register a new external learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;
  const learner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(learner);

  // 2. Prepare sending a direct message
  // We simulate a recipient UUID (is assumed valid in tenant context for test)
  const recipientId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const messageBody: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 8,
  });
  const sentAt: string & tags.Format<"date-time"> = new Date().toISOString();

  // 3. Send a direct message successfully
  const directMessage: IEnterpriseLmsDirectMessage =
    await api.functional.enterpriseLms.externalLearner.directMessages.create(
      connection,
      {
        body: {
          tenant_id: learner.tenant_id,
          sender_id: learner.id,
          recipient_id: recipientId,
          body: messageBody,
          sent_at: sentAt,
        } satisfies IEnterpriseLmsDirectMessage.ICreate,
      },
    );
  typia.assert(directMessage);

  TestValidator.equals(
    "direct message tenant_id matches",
    directMessage.tenant_id,
    learner.tenant_id,
  );
  TestValidator.equals(
    "direct message sender_id matches",
    directMessage.sender_id,
    learner.id,
  );
  TestValidator.equals(
    "direct message recipient_id matches",
    directMessage.recipient_id,
    recipientId,
  );
  TestValidator.equals(
    "direct message body matches",
    directMessage.body,
    messageBody,
  );
  TestValidator.predicate("direct message sent_at is valid ISO8601", () => {
    try {
      new Date(directMessage.sent_at);
      return true;
    } catch {
      return false;
    }
  });

  // 4. Failure case: invalid recipient_id
  await TestValidator.error(
    "sending direct message with invalid recipient_id should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.directMessages.create(
        connection,
        {
          body: {
            tenant_id: learner.tenant_id,
            sender_id: learner.id,
            recipient_id: typia.random<string & tags.Format<"uuid">>(), // Random invalid
            body: messageBody,
            sent_at: sentAt,
          } satisfies IEnterpriseLmsDirectMessage.ICreate,
        },
      );
    },
  );

  // 5. Failure case: missing body content
  await TestValidator.error(
    "sending direct message with empty body should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.directMessages.create(
        connection,
        {
          body: {
            tenant_id: learner.tenant_id,
            sender_id: learner.id,
            recipient_id: recipientId,
            body: "",
            sent_at: sentAt,
          } satisfies IEnterpriseLmsDirectMessage.ICreate,
        },
      );
    },
  );

  // 6. Failure case: mismatched tenant_id (simulate different tenant)
  await TestValidator.error(
    "sending direct message with mismatched tenant_id should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.directMessages.create(
        connection,
        {
          body: {
            tenant_id: typia.random<string & tags.Format<"uuid">>(), // Different tenant
            sender_id: learner.id,
            recipient_id: recipientId,
            body: messageBody,
            sent_at: sentAt,
          } satisfies IEnterpriseLmsDirectMessage.ICreate,
        },
      );
    },
  );
}
