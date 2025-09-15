import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * This End-to-End (E2E) test verifies the retrieval of a specific direct
 * message by an authenticated external learner user within an Enterprise
 * LMS system.
 *
 * The test proceeds through the following steps:
 *
 * 1. Registers a new external learner via the /auth/externalLearner/join
 *    endpoint using valid and schema-compliant registration data to obtain
 *    authentication tokens.
 * 2. Retrieves a direct message by its ID using the authentication context
 *    obtained, validating tenant isolation and confirming all expected
 *    message fields are present and correctly formatted.
 * 3. Validates failure cases including retrieval with an invalid message ID
 *    and access attempts without authentication, ensuring proper error
 *    handling.
 *
 * This test ensures robust authentication, authorization, data accuracy,
 * tenant boundary enforcement, and error response correctness.
 */
export async function test_api_direct_message_retrieval_with_authenticated_external_learner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate external learner user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> =
    `testuser_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: RandomGenerator.alphaNumeric(64),
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

  // 2. Retrieve an existing direct message that belongs to the same tenant
  // Generate a sample direct message id
  const directMessageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve the direct message
  const directMessage: IEnterpriseLmsDirectMessage =
    await api.functional.enterpriseLms.externalLearner.directMessages.at(
      connection,
      { directMessageId },
    );
  typia.assert(directMessage);

  // Validate tenant isolation: tenant_id must match authorized user's tenant_id
  TestValidator.equals(
    "tenant ID should match authorized user's tenant",
    directMessage.tenant_id,
    authorizedUser.tenant_id,
  );

  // Validate presence and correctness of required fields
  TestValidator.predicate(
    "direct message has valid id",
    typeof directMessage.id === "string" && directMessage.id.length > 0,
  );
  TestValidator.predicate(
    "direct message has valid sender_id",
    typeof directMessage.sender_id === "string" &&
      directMessage.sender_id.length > 0,
  );
  TestValidator.predicate(
    "direct message has valid recipient_id",
    typeof directMessage.recipient_id === "string" &&
      directMessage.recipient_id.length > 0,
  );
  TestValidator.predicate(
    "direct message has non-empty body",
    typeof directMessage.body === "string" && directMessage.body.length > 0,
  );
  TestValidator.predicate(
    "direct message has valid sent_at ISO date",
    typeof directMessage.sent_at === "string" &&
      !isNaN(Date.parse(directMessage.sent_at)),
  );

  // read_at and deleted_at should either be null or valid ISO date string
  if (directMessage.read_at !== null && directMessage.read_at !== undefined) {
    TestValidator.predicate(
      "direct message read_at valid date",
      typeof directMessage.read_at === "string" &&
        !isNaN(Date.parse(directMessage.read_at)),
    );
  } else {
    TestValidator.equals(
      "direct message read_at should be null or undefined",
      directMessage.read_at,
      null,
    );
  }
  if (
    directMessage.deleted_at !== null &&
    directMessage.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "direct message deleted_at valid date",
      typeof directMessage.deleted_at === "string" &&
        !isNaN(Date.parse(directMessage.deleted_at)),
    );
  } else {
    TestValidator.equals(
      "direct message deleted_at should be null or undefined",
      directMessage.deleted_at,
      null,
    );
  }

  // 3. Test failure: invalid directMessageId (expect error)
  await TestValidator.error(
    "retrieving with invalid directMessageId should fail",
    async () => {
      const invalidId =
        "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">;
      await api.functional.enterpriseLms.externalLearner.directMessages.at(
        connection,
        { directMessageId: invalidId },
      );
    },
  );

  // 4. Test failure: retrieval without authentication (use unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "retrieving direct message without auth should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.directMessages.at(
        unauthConnection,
        { directMessageId },
      );
    },
  );
}
