import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_content_version_retrieval_detail_authorized_organizationadmin(
  connection: api.IConnection,
) {
  // Step 1: OrganizationAdmin user creation
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: "Passw0rd!",
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const createdAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: createBody },
  );
  typia.assert(createdAdmin);

  // Step 2: OrganizationAdmin login
  const loginBody = {
    email: email,
    password: "Passw0rd!",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInAdmin);

  // Step 3: Retrieve contentVersion information
  const contentId = typia.random<string & tags.Format<"uuid">>();
  const contentVersionId = typia.random<string & tags.Format<"uuid">>();

  const contentVersion =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentVersions.at(
      connection,
      {
        contentId: contentId,
        id: contentVersionId,
      },
    );
  typia.assert(contentVersion);

  TestValidator.equals(
    "contentVersion.content_id equals path contentId",
    contentVersion.content_id,
    contentId,
  );

  TestValidator.equals(
    "contentVersion.id equals path id",
    contentVersion.id,
    contentVersionId,
  );

  TestValidator.predicate(
    "version_number is positive",
    contentVersion.version_number > 0,
  );
  TestValidator.predicate(
    "title is non-empty",
    contentVersion.title.length > 0,
  );
  TestValidator.predicate(
    "content_type is non-empty",
    contentVersion.content_type.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty",
    contentVersion.status.length > 0,
  );
  TestValidator.predicate(
    "business_status is non-empty",
    contentVersion.business_status.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      contentVersion.created_at,
    ),
  );

  // Step 4: Test invalid contentId error scenario
  await TestValidator.error(
    "invalid contentId should throw error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentVersions.at(
        connection,
        {
          contentId: "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
          id: contentVersionId,
        },
      );
    },
  );

  // Step 5: Test invalid contentVersion id error scenario
  await TestValidator.error(
    "invalid contentVersion id should throw error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentVersions.at(
        connection,
        {
          contentId: contentId,
          id: "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
