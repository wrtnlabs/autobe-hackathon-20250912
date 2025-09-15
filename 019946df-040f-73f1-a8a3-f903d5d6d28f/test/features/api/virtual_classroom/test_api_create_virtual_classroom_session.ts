import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";

/**
 * Test scenario for creating virtual classroom sessions by content
 * creator/instructor.
 *
 * This test covers realistic business flows in multi-tenant LMS
 * environment.
 *
 * 1. Register content creator/instructor user with tenant ID and details.
 * 2. Login to obtain authentication tokens.
 * 3. With token context:
 *
 *    - Create virtual classroom session with all required data.
 *    - Confirm response matches input plus system-generated IDs and timestamps.
 *    - Try dates invalid (end_at before start_at), expect failure.
 *    - Check tenant isolation: attempt create with different tenant ID, expect
 *         failure.
 * 4. Confirm session data persistence.
 * 5. Validate authorization enforcement.
 */
export async function test_api_create_virtual_classroom_session(
  connection: api.IConnection,
) {
  // Setup for content creator instructor user registration
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphabets(5)}@example.com`;
  const passwordRaw = RandomGenerator.alphaNumeric(10);
  const passwordHash = passwordRaw; // Simplified for testing - assume password is already properly hashed
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  // 1. Register content creator/instructor user
  const registeredUser =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status: status,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Login to obtain token
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: {
        email: email,
        password: passwordRaw,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    },
  );
  typia.assert(loggedInUser);

  // 3. Use authorization context automatically set by SDK through above login

  // Prepare valid data for virtual classroom creation
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const startAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now
  const endAt = new Date(Date.now() + 7200 * 1000).toISOString(); // 2 hours from now

  // 3.a Create a virtual classroom session with valid data
  const createdSession =
    await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          instructor_id: registeredUser.id,
          title: title,
          description: description,
          start_at: startAt,
          end_at: endAt,
        } satisfies IEnterpriseLmsVirtualClassroom.ICreate,
      },
    );
  typia.assert(createdSession);

  // Validate returned properties
  TestValidator.equals(
    "virtual classroom tenant_id matches",
    createdSession.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "virtual classroom instructor_id matches",
    createdSession.instructor_id,
    registeredUser.id,
  );
  TestValidator.equals(
    "virtual classroom title matches",
    createdSession.title,
    title,
  );
  TestValidator.equals(
    "virtual classroom description matches",
    createdSession.description ?? null,
    description ?? null,
  );
  TestValidator.equals(
    "virtual classroom start_at matches",
    createdSession.start_at,
    startAt,
  );
  TestValidator.equals(
    "virtual classroom end_at matches",
    createdSession.end_at,
    endAt,
  );

  // 3.c Attempt creation with invalid date range (end_at before start_at) - expect error
  const invalidEndAt = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
  await TestValidator.error("end_at before start_at should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          instructor_id: registeredUser.id,
          title: title,
          description: description,
          start_at: startAt,
          end_at: invalidEndAt,
        } satisfies IEnterpriseLmsVirtualClassroom.ICreate,
      },
    );
  });

  // 3.d Attempt creation with tenant_id different from user's tenant - expect error
  const anotherTenantId = typia.random<string & tags.Format<"uuid">>();
  if (anotherTenantId !== tenantId) {
    await TestValidator.error(
      "creating session with different tenant_id should fail",
      async () => {
        await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.create(
          connection,
          {
            body: {
              tenant_id: anotherTenantId,
              instructor_id: registeredUser.id,
              title: title,
              description: description,
              start_at: startAt,
              end_at: endAt,
            } satisfies IEnterpriseLmsVirtualClassroom.ICreate,
          },
        );
      },
    );
  }

  // 3.e Attempt creation with unauthorized (simulate unauthenticated by new connection with empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized creation should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.create(
      unauthenticatedConnection,
      {
        body: {
          tenant_id: tenantId,
          instructor_id: registeredUser.id,
          title: title,
          description: description,
          start_at: startAt,
          end_at: endAt,
        } satisfies IEnterpriseLmsVirtualClassroom.ICreate,
      },
    );
  });

  // 4. Confirm session data persistence: Normally would query or list endpoint, but only creation endpoint is provided
  // So validate createdSession properties again to confirm data consistency
  TestValidator.predicate(
    "created virtual classroom session has non-empty id",
    typeof createdSession.id === "string" && createdSession.id.length > 0,
  );

  TestValidator.predicate(
    "created virtual classroom session timestamps are valid ISO strings",
    typeof createdSession.created_at === "string" &&
      new Date(createdSession.created_at).toString() !== "Invalid Date" &&
      typeof createdSession.updated_at === "string" &&
      new Date(createdSession.updated_at).toString() !== "Invalid Date",
  );
}
