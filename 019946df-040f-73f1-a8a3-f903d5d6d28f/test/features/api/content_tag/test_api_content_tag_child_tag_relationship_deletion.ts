import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This test covers the entire business flow for a system administrator to
 * delete a child tag relationship under a parent content tag in the
 * Enterprise LMS system. The scenario includes robust checks for
 * authorization, proper execution, and error handling.
 *
 * Steps:
 *
 * 1. System administrator joins and authenticates using
 *    /auth/systemAdmin/join.
 * 2. Assume the parent and child content tags exist (UUIDs are generated for
 *    test).
 * 3. The system admin deletes the child tag relationship using the DELETE
 *    endpoint.
 * 4. Verifies successful deletion (expected no response).
 * 5. Attempts deletion with an unauthenticated connection to verify
 *    authorization enforcement.
 *
 * This test ensures the relationship deletion endpoint is secure and
 * functional.
 */
export async function test_api_content_tag_child_tag_relationship_deletion(
  connection: api.IConnection,
) {
  // 1. System administrator joins and authenticates
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(20);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const sysAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status: status,
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(sysAdmin);

  // 2. Simulate existing parent and child content tag IDs
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const childTagId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform deletion of child tag relationship by system admin
  await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.eraseChildTagRelationship(
    connection,
    {
      parentTagId,
      childTagId,
    },
  );

  // 4. Attempt deletion with unauthorized connection, expect authorization failure
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized deletion attempt fails", async () => {
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.eraseChildTagRelationship(
      unauthorizedConnection,
      { parentTagId, childTagId },
    );
  });
}
