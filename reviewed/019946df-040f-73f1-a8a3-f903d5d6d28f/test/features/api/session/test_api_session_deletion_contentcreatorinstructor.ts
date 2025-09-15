import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test case validates deletion of a session by a content
 * creator/instructor user. The test first creates and authenticates a
 * ContentCreatorInstructor user using the
 * /auth/contentCreatorInstructor/join endpoint. Next, to establish a valid
 * session to delete, the test creates a session record using the POST
 * /enterpriseLms/systemAdmin/sessions API. Then, authenticated as the
 * ContentCreatorInstructor user, the test deletes the created session via
 * DELETE /enterpriseLms/contentCreatorInstructor/sessions/{id}. Finally,
 * the test verifies that the session is no longer available by attempting
 * deletion again to confirm it fails (ensuring deletion success and
 * authorization correctness). The test also handles authentication role
 * switching properly via explicit login calls for ContentCreatorInstructor
 * and SystemAdmin users. All DTO properties comply with schema definitions
 * and business context, using realistic generated data where appropriate.
 * The test validates API responses by typia.assert and uses TestValidator
 * for logical assertions and error expectation with descriptive titles.
 */
export async function test_api_session_deletion_contentcreatorinstructor(
  connection: api.IConnection,
) {
  // 1. Generate plain password for ContentCreatorInstructor
  const contentCreatorPassword: string = RandomGenerator.alphaNumeric(16);
  // 2. ContentCreatorInstructor user registration
  const contentCreatorInstructorUser =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: `${RandomGenerator.name(1)}@example.com`,
        password_hash: contentCreatorPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructorUser);

  // 3. SystemAdmin user registration to create a session
  const systemAdminUser = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(16),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    },
  );
  typia.assert(systemAdminUser);

  // 4. SystemAdmin user login to authenticate for session creation
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminUser.email,
      password_hash: systemAdminUser.password_hash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 5. Create a new session using SystemAdmin session create API
  const sessionToDelete =
    await api.functional.enterpriseLms.systemAdmin.sessions.create(connection, {
      body: {
        enterprise_lms_tenant_id: systemAdminUser.tenant_id,
        user_id: systemAdminUser.id,
        session_token: RandomGenerator.alphaNumeric(32),
        ip_address: null,
        device_info: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      } satisfies IEnterpriseLmsSession.ICreate,
    });
  typia.assert(sessionToDelete);

  // 6. ContentCreatorInstructor user login for deletion authorization context
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorInstructorUser.email,
      password: contentCreatorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 7. Delete the session as ContentCreatorInstructor user
  await api.functional.enterpriseLms.contentCreatorInstructor.sessions.erase(
    connection,
    {
      id: sessionToDelete.id,
    },
  );

  // 8. Verify the session is deleted by attempting to delete again, expecting error
  await TestValidator.error(
    "Deleting already deleted session should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.sessions.erase(
        connection,
        {
          id: sessionToDelete.id,
        },
      );
    },
  );
}
