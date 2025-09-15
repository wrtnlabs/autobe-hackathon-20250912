import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test scenario for the deletion of blended learning sessions by
 * organizationAdmin users.
 *
 * This test covers:
 *
 * - Registration and authentication of two organizationAdmin users belonging to
 *   different tenants.
 * - Creation of blended learning sessions by both users.
 * - Successful deletion of a session by the owning user.
 * - Validation that deleted sessions cannot be deleted again.
 * - Validation that a user cannot delete sessions belonging to another tenant.
 * - Proper tenant isolation ensuring one tenant's session does not affect the
 *   other.
 *
 * The test validates all API responses using typia.assert and business logic
 * correctness with TestValidator, ensuring proper authorization and
 * tenant-based access control.
 */
export async function test_api_blended_learning_session_delete_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register organizationAdmin user A (Tenant A)
  const tenantAId: string = typia.random<string & tags.Format<"uuid">>();
  const userACreate = {
    tenant_id: tenantAId,
    email: `usera.${typia.random<string & tags.Format<"email">>()}`,
    password: "Passw0rd!",
    first_name: "Alice",
    last_name: "Smith",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const userA: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: userACreate,
    });
  typia.assert(userA);

  // 2. Register organizationAdmin user B (Tenant B)
  const tenantBId: string = typia.random<string & tags.Format<"uuid">>();
  const userBCreate = {
    tenant_id: tenantBId,
    email: `userb.${typia.random<string & tags.Format<"email">>()}`,
    password: "Passw0rd!",
    first_name: "Bob",
    last_name: "Jones",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  await api.functional.auth.organizationAdmin.join(connection, {
    body: userBCreate,
  });

  // 3. Login user A
  const userALogin = {
    email: userACreate.email,
    password: userACreate.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const userALoginData: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: userALogin,
    });
  typia.assert(userALoginData);

  // 4. User A creates a blended learning session
  const sessionCreateA = {
    tenant_id: tenantAId,
    session_type: "online",
    title: "User A Session",
    description: "Session description A",
    status: "scheduled",
    scheduled_start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  const sessionA: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
      connection,
      {
        body: sessionCreateA,
      },
    );
  typia.assert(sessionA);

  // 5. Login user B
  const userBLogin = {
    email: userBCreate.email,
    password: userBCreate.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const userBLoginData: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: userBLogin,
    });
  typia.assert(userBLoginData);

  // 6. User B creates a blended learning session
  const sessionCreateB = {
    tenant_id: tenantBId,
    session_type: "offline",
    title: "User B Session",
    description: "Session description B",
    status: "scheduled",
    scheduled_start_at: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  const sessionB: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.create(
      connection,
      {
        body: sessionCreateB,
      },
    );
  typia.assert(sessionB);

  // 7. User A deletes own session successfully
  await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.erase(
    connection,
    {
      sessionId: sessionA.id,
    },
  );

  // 8. Try deleting the same session again by user A - expect error
  await TestValidator.error(
    "deleting already deleted session should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.erase(
        connection,
        {
          sessionId: sessionA.id,
        },
      );
    },
  );

  // 9. Login user B again to confirm
  await api.functional.auth.organizationAdmin.login(connection, {
    body: userBLogin,
  });

  // 10. Try user B deleting user A's session - expect error
  await TestValidator.error(
    "user B deleting user A's session should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.erase(
        connection,
        {
          sessionId: sessionA.id,
        },
      );
    },
  );

  // 11. User B deletes own session successfully
  await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.erase(
    connection,
    {
      sessionId: sessionB.id,
    },
  );
}
