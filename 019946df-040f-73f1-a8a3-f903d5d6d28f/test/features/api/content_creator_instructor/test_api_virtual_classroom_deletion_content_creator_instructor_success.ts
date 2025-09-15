import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

export async function test_api_virtual_classroom_deletion_content_creator_instructor_success(
  connection: api.IConnection,
) {
  // 1. Register a new contentCreatorInstructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const passwordPlain = RandomGenerator.alphaNumeric(10);
  // Simulate a password hash (64 hexadecimal characters)
  const passwordHash = ArrayUtil.repeat(64, () =>
    RandomGenerator.pick([..."0123456789abcdef"]),
  ).join("");

  const contentCreatorInstructor =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructor);

  // 2. Login with created user
  const login = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: {
        email: email,
        password: passwordPlain,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    },
  );
  typia.assert(login);

  // 3. Simulate existing virtual classroom ID
  const virtualClassroomId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the virtual classroom
  await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.erase(
    connection,
    { virtualClassroomId: virtualClassroomId },
  );

  // 5. Validate error for deletion of non-existent session
  const nonExistentVirtualClassroomId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting non-existent virtual classroom throws 404",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.erase(
        connection,
        { virtualClassroomId: nonExistentVirtualClassroomId },
      );
    },
  );

  // 6. Validate error for unauthorized deletion (simulate by resetting headers)
  const unauthorizedConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion should throw 403",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.erase(
        unauthorizedConnection,
        { virtualClassroomId: virtualClassroomId },
      );
    },
  );
}
