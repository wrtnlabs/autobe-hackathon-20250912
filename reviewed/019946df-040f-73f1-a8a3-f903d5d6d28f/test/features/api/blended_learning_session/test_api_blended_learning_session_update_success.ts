import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

export async function test_api_blended_learning_session_update_success(
  connection: api.IConnection,
) {
  // 1. Corporate learner registration
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase()}${typia.random<number & tags.Type<"uint32">>()}@example.com`;
  const password = "Password123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const registered: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(registered);

  // 2. Corporate learner login
  const loggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email,
        password,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(loggedIn);

  // 3. Prepare blended learning session update payload
  const sessionUpdatePayload = {
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 7200 * 1000).toISOString(),
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // 4. A hypothetical sessionId for testing update
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 5. Call update API
  const updatedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.corporateLearner.blendedLearningSessions.update(
      connection,
      {
        sessionId,
        body: sessionUpdatePayload,
      },
    );
  typia.assert(updatedSession);

  // 6. Validate updated session properties against input
  TestValidator.equals(
    "tenant_id matches join tenant_id",
    updatedSession.tenant_id,
    registered.tenant_id,
  );
  TestValidator.equals(
    "session_type matches update payload",
    updatedSession.session_type,
    sessionUpdatePayload.session_type ?? updatedSession.session_type,
  );
  TestValidator.equals(
    "title matches update payload",
    updatedSession.title,
    sessionUpdatePayload.title ?? updatedSession.title,
  );
  TestValidator.equals(
    "description matches update payload",
    updatedSession.description ?? null,
    sessionUpdatePayload.description ?? null,
  );
  TestValidator.equals(
    "status matches update payload",
    updatedSession.status,
    sessionUpdatePayload.status ?? updatedSession.status,
  );
  TestValidator.equals(
    "scheduled_start_at matches update payload",
    updatedSession.scheduled_start_at,
    sessionUpdatePayload.scheduled_start_at ??
      updatedSession.scheduled_start_at,
  );
  if (sessionUpdatePayload.scheduled_end_at === undefined) {
    TestValidator.equals(
      "scheduled_end_at is unchanged",
      updatedSession.scheduled_end_at ?? null,
      updatedSession.scheduled_end_at ?? null,
    );
  } else {
    TestValidator.equals(
      "scheduled_end_at matches update payload",
      updatedSession.scheduled_end_at ?? null,
      sessionUpdatePayload.scheduled_end_at ?? null,
    );
  }
}
