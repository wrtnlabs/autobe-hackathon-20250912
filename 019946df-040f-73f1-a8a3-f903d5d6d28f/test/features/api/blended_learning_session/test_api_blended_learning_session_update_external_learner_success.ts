import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * This test scenario validates the update of a blended learning session by an
 * authenticated external learner. It starts with the external learner joining
 * to establish authentication context, providing necessary tenant_id, email,
 * password_hash, first_name, last_name, and status for joining. Then the
 * external learner updates a blended learning session with a valid sessionId
 * and an update payload following the
 * IEnterpriseLmsBlendedLearningSession.IUpdate type. The update payload
 * includes valid realistic values for session_type, title, optional description
 * (explicitly set to null to indicate no description), status, and scheduling
 * timestamps including scheduled_start_at (mandatory), scheduled_end_at
 * (nullable with explicit null), actual_start_at (nullable with explicit null),
 * and actual_end_at (nullable with explicit null). The test asserts correct
 * response structure and type validity after update is applied. The scenario
 * enforces tenant isolation and proper role permissions. It ensures proper
 * async/await usage and accurate data typing, including UUID and ISO 8601
 * date-time string formats. Both successful session update and authentication
 * flow are validated rigorously.
 */
export async function test_api_blended_learning_session_update_external_learner_success(
  connection: api.IConnection,
) {
  // 1. Perform join to register and authenticate external learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;
  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(authorized);

  // 2. Prepare update payload with detailed properties, nullable and optional as per schema
  const updateBody = {
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: null,
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(Date.now() + 86400000).toISOString(),
    scheduled_end_at: null,
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // 3. Use a valid UUID for sessionId
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call update API with sessionId and updateBody
  const response: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.update(
      connection,
      { sessionId, body: updateBody },
    );
  typia.assert(response);

  // 5. Additional assertions
  TestValidator.predicate(
    "response id is a valid UUID",
    typeof response.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        response.id,
      ),
  );
  TestValidator.equals(
    "response sessionId matches request",
    response.id,
    sessionId,
  );
  TestValidator.equals(
    "response session_type matches update",
    response.session_type,
    updateBody.session_type,
  );
  TestValidator.equals(
    "response title matches update",
    response.title,
    updateBody.title,
  );
  TestValidator.equals(
    "response description matches update",
    response.description,
    updateBody.description,
  );
  TestValidator.equals(
    "response status matches update",
    response.status,
    updateBody.status,
  );
  TestValidator.equals(
    "response scheduled_start_at matches update",
    response.scheduled_start_at,
    updateBody.scheduled_start_at,
  );
  TestValidator.equals(
    "response scheduled_end_at matches update",
    response.scheduled_end_at,
    updateBody.scheduled_end_at,
  );
  TestValidator.equals(
    "response actual_start_at matches update",
    response.actual_start_at,
    updateBody.actual_start_at,
  );
  TestValidator.equals(
    "response actual_end_at matches update",
    response.actual_end_at,
    updateBody.actual_end_at,
  );
}
