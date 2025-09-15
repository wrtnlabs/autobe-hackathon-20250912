import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Tests the creation of blended learning sessions by an authenticated
 * organization administrator in a multi-tenant environment.
 *
 * The test covers positive cases for all valid session types and statuses,
 * verifying proper scheduling, tenant scoping, and response data integrity. It
 * also checks for invalid session type, invalid date format, and unauthorized
 * access scenarios to ensure validation and security constraints are enforced.
 *
 * This comprehensive test ensures that blended learning sessions can be created
 * correctly and securely within tenant boundaries with full data validation.
 */
export async function test_api_blended_learning_session_creation_with_various_conditions(
  connection: api.IConnection,
) {
  // 1. Register organization admin for tenant authorization
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: RandomGenerator.pick([
      "admin1@tenant.com",
      "admin2@tenant.com",
      "admin3@tenant.com",
    ] as const),
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create blended learning sessions with valid data
  const validSessionTypes = ["ONLINE", "OFFLINE", "HYBRID"] as const;
  const validStatuses = ["planned", "scheduled"] as const;

  for (const type of validSessionTypes) {
    for (const status of validStatuses) {
      // Scheduled start and end ISO dates - start now + random hours, end after start
      const now = new Date();
      const startDate = new Date(
        now.getTime() + 3600000 * RandomGenerator.alphaNumeric(4).length,
      );
      const endDate = new Date(
        startDate.getTime() + 3600000 * RandomGenerator.alphaNumeric(2).length,
      );

      const createBody = {
        tenant_id: tenantId,
        session_type: type,
        title: `Session ${type} - ${status}`,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: status,
        scheduled_start_at: startDate.toISOString(),
        scheduled_end_at: endDate.toISOString(),
        actual_start_at: null,
        actual_end_at: null,
      } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

      const session =
        await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
          connection,
          {
            body: createBody,
          },
        );
      typia.assert(session);
      TestValidator.equals(
        "tenant_id should match input",
        session.tenant_id,
        tenantId,
      );
      TestValidator.equals(
        "session_type should match input",
        session.session_type,
        type,
      );
      TestValidator.equals("status should match input", session.status, status);
      TestValidator.equals(
        "title should match input",
        session.title,
        createBody.title,
      );
    }
  }

  // 3. Test creating with invalid sessionType should throw validation error
  await TestValidator.error("invalid session_type should fail", async () => {
    const invalidBody = {
      tenant_id: tenantId,
      session_type: "INVALID_TYPE",
      title: "Invalid Type Session",
      status: "planned",
      scheduled_start_at: new Date().toISOString(),
    } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
      connection,
      {
        body: invalidBody,
      },
    );
  });

  // 4. Test invalid date format should fail
  await TestValidator.error("invalid date format should fail", async () => {
    const invalidDateBody = {
      tenant_id: tenantId,
      session_type: "OFFLINE",
      title: "Invalid Date Session",
      status: "scheduled",
      scheduled_start_at: "invalid-date-string",
    } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
      connection,
      {
        body: invalidDateBody,
      },
    );
  });

  // 5. Test unauthorized access should fail
  const unauthConn: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.error("unauthorized creation should fail", async () => {
    const unauthorizedBody = {
      tenant_id: tenantId,
      session_type: "HYBRID",
      title: "Unauthorized Session",
      status: "planned",
      scheduled_start_at: new Date().toISOString(),
    } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
      unauthConn,
      {
        body: unauthorizedBody,
      },
    );
  });
}
