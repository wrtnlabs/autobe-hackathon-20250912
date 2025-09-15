import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test retrieving detailed information for a specific content version by ID
 * as an authorized systemAdmin.
 *
 * This test ensures that content version details can be successfully
 * retrieved for a systemAdmin user after proper authentication via join and
 * login. It validates both the proper functioning of the detail retrieval
 * endpoint and the access control mechanisms.
 *
 * Workflow:
 *
 * 1. Register a systemAdmin user with realistic data.
 * 2. Login as the systemAdmin user with matching credentials.
 * 3. Generate valid UUIDs for contentId and content version id for test.
 * 4. Retrieve the content version detail using GET
 *    /enterpriseLms/systemAdmin/contents/{contentId}/contentVersions/{id}
 *    endpoint.
 * 5. Assert the response data matches the ID used and conforms to the response
 *    structure.
 *
 * This test validates both authentication and detailed content version
 * retrieval logic.
 */
export async function test_api_content_version_retrieval_detail_authorized_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register a new systemAdmin user
  const systemAdminCreateBody = {
    email: RandomGenerator.pick([
      "admin1@company.com",
      "admin2@company.com",
      "sysadmin@enterprise.com",
    ] as const),
    password_hash: "hashed-secret-password",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as the created systemAdmin user
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminAuth: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminAuth);

  // 3. Generate valid UUIDs for contentId and content version id
  const contentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const versionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Retrieve the detailed content version information
  const contentVersion: IEnterpriseLmsContentVersion =
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.at(
      connection,
      {
        contentId,
        id: versionId,
      },
    );
  typia.assert(contentVersion);

  // 5. Validate that the returned contentVersion matches the request IDs
  TestValidator.equals(
    "contentVersion.id matches request id",
    contentVersion.id,
    versionId,
  );
  TestValidator.equals(
    "contentVersion.content_id matches contentId",
    contentVersion.content_id,
    contentId,
  );
}
