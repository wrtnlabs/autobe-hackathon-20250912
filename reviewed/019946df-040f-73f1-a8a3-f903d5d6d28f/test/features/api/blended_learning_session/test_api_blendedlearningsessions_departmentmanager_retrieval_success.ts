import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This end-to-end test validates the retrieval of a blended learning session by
 * a department manager authenticated user. The test covers the full workflow
 * of: user creation and authentication, blended learning session creation
 * within the tenant context, and retrieval of that session validating correct
 * data and tenant isolation. The test asserts data accuracy and business rules,
 * ensuring only authorized tenant data is accessible.
 */
export async function test_api_blendedlearningsessions_departmentmanager_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new department manager user and authenticate
  const joinBody = {
    email: `manager_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPassw0rd!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Step 2: Login with the same department manager to confirm authentication and token
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;
  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Step 3: Create a new blended learning session associated with the tenant ID
  const sessionCreateBody = {
    tenant_id: authorized.tenant_id,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.departmentManager.blendedLearningSessions.create(
      connection,
      {
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  TestValidator.equals(
    "Created session tenant matches authorized tenant",
    createdSession.tenant_id,
    authorized.tenant_id,
  );

  // Step 4: Retrieve the session by sessionId
  const retrievedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.departmentManager.blendedLearningSessions.at(
      connection,
      {
        sessionId: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  // Step 5: Validate that the retrieved session matches the created session
  TestValidator.equals(
    "Retrieved session ID matches created session ID",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "Retrieved session tenant ID matches created session tenant ID",
    retrievedSession.tenant_id,
    createdSession.tenant_id,
  );
  TestValidator.equals(
    "Retrieved session type matches created session type",
    retrievedSession.session_type,
    createdSession.session_type,
  );
  TestValidator.equals(
    "Retrieved session title matches created session title",
    retrievedSession.title,
    createdSession.title,
  );
  TestValidator.equals(
    "Retrieved session status matches created session status",
    retrievedSession.status,
    createdSession.status,
  );
  TestValidator.equals(
    "Retrieved session scheduled start matches created session",
    retrievedSession.scheduled_start_at,
    createdSession.scheduled_start_at,
  );
  TestValidator.equals(
    "Retrieved session scheduled end matches created session",
    retrievedSession.scheduled_end_at,
    createdSession.scheduled_end_at,
  );
  TestValidator.equals(
    "Retrieved session actual start matches created session",
    retrievedSession.actual_start_at,
    createdSession.actual_start_at,
  );
  TestValidator.equals(
    "Retrieved session actual end matches created session",
    retrievedSession.actual_end_at,
    createdSession.actual_end_at,
  );

  // Step 6: Data isolation - ensure the tenant ID of retrieved session matches that of the logged-in department manager
  TestValidator.equals(
    "Tenant isolation verified: retrieved session tenant matches logged-in tenant",
    retrievedSession.tenant_id,
    authorized.tenant_id,
  );
}
