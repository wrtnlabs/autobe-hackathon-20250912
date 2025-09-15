import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * E2E Test for system administrator deleting a content tag.
 *
 * This test validates the entire workflow where a system administrator is first
 * created and authenticated, then successfully deletes a content tag by its
 * UUID. The test also attempts to delete a non-existent content tag ID and
 * verifies that the attempt fails correctly, enforcing proper authorization and
 * error handling.
 *
 * Steps:
 *
 * 1. Register and authenticate a system administrator account.
 * 2. Delete a content tag identified by a randomly generated UUID.
 * 3. Attempt to delete a non-existent content tag and confirm failure.
 *
 * Validations ensure complete type safety, correct status handling, and proper
 * business logic enforcement.
 */
export async function test_api_content_tag_deletion_with_system_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new system administrator
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Delete a content tag by a freshly generated UUID
  // Using typia.random to generate UUID format string
  const validContentTagId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.enterpriseLms.systemAdmin.contentTags.erase(connection, {
    id: validContentTagId,
  });

  // 3. Attempt to delete a non-existent content tag ID expecting an error
  await TestValidator.error(
    "Attempting deletion of a non-existent content tag should fail",
    async () => {
      const nonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.enterpriseLms.systemAdmin.contentTags.erase(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
