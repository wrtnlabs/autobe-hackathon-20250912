import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";

/**
 * This E2E test function validates the user workflow of updating a virtual
 * classroom session by a content creator/instructor user in the Enterprise LMS.
 * It follows the complete scenario of user registration, login, and updating
 * the session while verifying all assertions.
 *
 * Steps:
 *
 * 1. Register a new content creator/instructor user using valid tenant_id, email,
 *    password hash, first name, last name, and active status.
 * 2. Login with the created user's email and password to obtain an authorization
 *    token.
 * 3. Update an existing virtual classroom session with new title, optional
 *    description, and future session start and end timestamps.
 * 4. Verify that the updated virtual classroom reflects all changes accurately.
 */
export async function test_api_virtual_classroom_update_content_creator_instructor_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new content creator/instructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const passwordPlain = "StrongP@ssw0rd!";

  // Use a realistic hashed password string placeholder to satisfy password_hash
  const fakePasswordHash =
    "$2b$12$C5hj5G4q5MK5F6rfRl5Pxe85L0nL6aiiQ3KhXE52G7/Qo9rN83T9u";

  const joinBody = {
    tenant_id: tenantId,
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: fakePasswordHash,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const joinedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // Step 2: Login the user with the email and plain password
  const loginBody = {
    email: joinBody.email,
    password: passwordPlain,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedInUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Update an existing virtual classroom session
  // Since no create API exists, we generate a random valid UUID for virtualClassroomId
  const virtualClassroomId = typia.random<string & tags.Format<"uuid">>();

  // Generate future start_at and end_at timestamps
  const now = new Date();
  const futureStart = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later
  const futureEnd = new Date(futureStart.getTime() + 1000 * 60 * 60); // 1 hour duration

  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    start_at: futureStart.toISOString(),
    end_at: futureEnd.toISOString(),
  } satisfies IEnterpriseLmsVirtualClassroom.IUpdate;

  const updatedSession: IEnterpriseLmsVirtualClassroom =
    await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.update(
      connection,
      {
        virtualClassroomId: virtualClassroomId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // Step 4: Validate updated fields
  TestValidator.equals(
    "updated session title",
    updatedSession.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated session description",
    updatedSession.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "updated session start_at",
    updatedSession.start_at,
    updateBody.start_at,
  );
  TestValidator.equals(
    "updated session end_at",
    updatedSession.end_at,
    updateBody.end_at,
  );
  TestValidator.equals(
    "tenant id unchanged",
    updatedSession.tenant_id,
    joinedUser.tenant_id,
  );
  TestValidator.equals(
    "instructor id unchanged",
    updatedSession.instructor_id,
    joinedUser.id,
  );
}
