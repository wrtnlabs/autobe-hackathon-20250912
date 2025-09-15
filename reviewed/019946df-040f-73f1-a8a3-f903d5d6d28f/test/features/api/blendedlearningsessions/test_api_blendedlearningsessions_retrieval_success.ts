import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test validates the successful workflow of retrieving detailed
 * information of a blended learning session in an Enterprise LMS system using
 * the GET /enterpriseLms/organizationAdmin/blendedLearningSessions/{sessionId}
 * endpoint.
 *
 * The comprehensive steps include:
 *
 * 1. Creating a new organizationAdmin user affiliated with a tenant by calling the
 *    /auth/organizationAdmin/join endpoint, ensuring valid tenant ID, email,
 *    password, and names.
 * 2. Logging in as that user to establish an authentication context.
 * 3. Creating a blended learning session in the tenant, respecting all required
 *    fields and valid ISO date formats.
 * 4. Retrieving the session by ID to validate correctness and tenant isolation.
 *
 * All responses are validated with typia.assert for type completeness and all
 * functional assertions confirm data consistency in the multi-tenant scenario.
 */
export async function test_api_blendedlearningsessions_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create an organizationAdmin user with tenant affiliation
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const adminEmail: string = RandomGenerator.alphaNumeric(6) + "@example.com";
  const adminUser: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password: "StrongPassw0rd!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Login as organizationAdmin user
  const loggedInUser: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedInUser);

  // 3. Create a blended learning session
  const startDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
  const sessionCreateBody = {
    tenant_id: tenantId,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    description: null,
    status: "scheduled",
    scheduled_start_at: startDate,
    scheduled_end_at: endDate,
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
      connection,
      {
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // Validate session consistency
  TestValidator.equals("tenant_id matches", createdSession.tenant_id, tenantId);
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
  TestValidator.equals("status matches", createdSession.status, "scheduled");
  TestValidator.equals(
    "scheduled_start_at matches",
    createdSession.scheduled_start_at,
    startDate,
  );
  TestValidator.equals(
    "scheduled_end_at matches",
    createdSession.scheduled_end_at,
    endDate,
  );
  TestValidator.equals("description is null", createdSession.description, null);

  // 4. Retrieve the blended learning session by sessionId
  const retrievedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.at(
      connection,
      {
        sessionId: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  // Validate retrieved session matches created session
  TestValidator.equals(
    "retrieved session id",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "retrieved tenant_id",
    retrievedSession.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "retrieved session_type",
    retrievedSession.session_type,
    sessionCreateBody.session_type,
  );
  TestValidator.equals(
    "retrieved title",
    retrievedSession.title,
    sessionCreateBody.title,
  );
  TestValidator.equals(
    "retrieved status",
    retrievedSession.status,
    "scheduled",
  );
  TestValidator.equals(
    "retrieved scheduled_start_at",
    retrievedSession.scheduled_start_at,
    startDate,
  );
  TestValidator.equals(
    "retrieved scheduled_end_at",
    retrievedSession.scheduled_end_at,
    endDate,
  );
  TestValidator.equals(
    "retrieved description",
    retrievedSession.description,
    null,
  );
}
