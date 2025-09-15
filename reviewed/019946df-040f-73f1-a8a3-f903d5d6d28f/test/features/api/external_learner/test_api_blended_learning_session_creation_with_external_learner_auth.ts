import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

export async function test_api_blended_learning_session_creation_with_external_learner_auth(
  connection: api.IConnection,
) {
  // Step 1: Register external learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64), // Simulating a hashed password
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

  // Step 2: tenant_id for session creation must match authorized tenant_id
  const tenantId = authorized.tenant_id;

  // Step 3: Create blended learning session body
  const now = new Date();
  const scheduledStartAt = now.toISOString();

  const sessionCreateBody = {
    tenant_id: tenantId,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: scheduledStartAt,
    scheduled_end_at: null,
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  // Step 4: Create blended learning session with auth token
  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.create(
      connection,
      { body: sessionCreateBody },
    );

  typia.assert(createdSession);
  typia.assert<string & tags.Format<"uuid">>(createdSession.id);

  // Step 5: Validation of tenant_id and minimal properties
  TestValidator.equals("tenant_id matches", createdSession.tenant_id, tenantId);
  TestValidator.equals(
    "status matches requested",
    createdSession.status,
    sessionCreateBody.status,
  );
  TestValidator.equals(
    "session_type matches requested",
    createdSession.session_type,
    sessionCreateBody.session_type,
  );
  TestValidator.equals(
    "title matches requested",
    createdSession.title,
    sessionCreateBody.title,
  );
  TestValidator.equals(
    "scheduled_start_at matches requested",
    createdSession.scheduled_start_at,
    scheduledStartAt,
  );

  // Step 6: Optional check for deletion timestamp to be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdSession.deleted_at === null ||
      createdSession.deleted_at === undefined,
  );
}
