import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Comprehensive e2e test cases for blended learning session creation by
 * system admin.
 *
 * Covers:
 *
 * - System admin user creation and authentication
 * - Successful creation of blended learning session
 * - Validation of created session data fields including tenant_id correctness
 * - Negative tests for missing required fields and invalid tenant IDs
 * - Testing unauthorized access attempt
 */
export async function test_api_blended_learning_sessions_creation_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a system administrator user with valid details
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(systemAdmin);

  // Step 2: Login with the newly created system admin credentials
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Step 3: Prepare valid blended learning session create payload
  const sessionCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    session_type: "online",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 7,
    }),
    status: "scheduled",
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  // Step 4: Create the blended learning session and validate response
  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.create(
      connection,
      { body: sessionCreateBody },
    );
  typia.assert(createdSession);

  TestValidator.equals(
    "tenant_id matches admin tenant",
    createdSession.tenant_id,
    systemAdmin.tenant_id,
  );
  TestValidator.equals(
    "session_type matches",
    createdSession.session_type,
    sessionCreateBody.session_type,
  );
  TestValidator.equals(
    "title matches",
    createdSession.title,
    sessionCreateBody.title,
  );
  TestValidator.equals(
    "description matches",
    createdSession.description,
    sessionCreateBody.description,
  );
  TestValidator.equals(
    "status matches",
    createdSession.status,
    sessionCreateBody.status,
  );
  TestValidator.equals(
    "scheduled_start_at matches",
    createdSession.scheduled_start_at,
    sessionCreateBody.scheduled_start_at,
  );
  TestValidator.equals(
    "scheduled_end_at matches",
    createdSession.scheduled_end_at,
    sessionCreateBody.scheduled_end_at,
  );
  TestValidator.equals(
    "actual_start_at is null",
    createdSession.actual_start_at,
    null,
  );
  TestValidator.equals(
    "actual_end_at is null",
    createdSession.actual_end_at,
    null,
  );

  // Step 5: Negative test - creating session without required title should error
  // Omit title property; to satisfy ICreate, cast as unknown before as ICreate
  const invalidBodyMissingTitle = {
    tenant_id: systemAdmin.tenant_id,
    session_type: "online",
    status: "scheduled",
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } as unknown as IEnterpriseLmsBlendedLearningSession.ICreate;

  await TestValidator.error("create fails without title", async () => {
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.create(
      connection,
      { body: invalidBodyMissingTitle },
    );
  });

  // Step 6: Negative test - creating session with invalid tenant_id should error
  const invalidTenantIdBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    session_type: "online",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    status: "scheduled",
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  await TestValidator.error("create fails with invalid tenant_id", async () => {
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.create(
      connection,
      { body: invalidTenantIdBody },
    );
  });

  // Step 7: Negative test - unauthorized create with no auth tokens
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("create fails without authorization", async () => {
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.create(
      unauthConn,
      { body: sessionCreateBody },
    );
  });
}
