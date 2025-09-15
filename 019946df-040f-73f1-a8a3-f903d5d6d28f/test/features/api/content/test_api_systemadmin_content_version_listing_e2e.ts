import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentVersion";

/**
 * This e2e test scenario verifies that a system administrator can list content
 * versions for a content record they manage. It covers the full business flow:
 *
 * 1. Creating and authenticating a systemAdmin user; 2) Creating an enterprise LMS
 *    content by a contentCreatorInstructor user; 3) Using the systemAdmin role,
 *    retrieving a paginated list of content versions by calling PATCH
 *    /enterpriseLms/systemAdmin/contents/{contentId}/contentVersions with
 *    typical pagination, search, and sort parameters; 4) Validating that the
 *    content versions returned are consistent with the created content; 5)
 *    Testing error case for non-existent contentId; 6) Testing unauthorized
 *    access. The test ensures pagination and filtering behave correctly, and
 *    the list properly associates to the contentId. This supports systemAdmin
 *    auditing and content lifecycle management in a secure multi-tenant
 *    environment.
 */
export async function test_api_systemadmin_content_version_listing_e2e(
  connection: api.IConnection,
) {
  // 1. Register and authenticate systemAdmin user
  const systemAdminCreateBody = {
    email: RandomGenerator.name(1).toLowerCase() + "@example.com",
    password_hash: "hashedpassword123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdminUser = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: systemAdminCreateBody,
    },
  );
  typia.assert(systemAdminUser);

  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: "hashedpassword123",
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminAuth = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: systemAdminLoginBody,
    },
  );
  typia.assert(systemAdminAuth);

  // 2. Register and authenticate contentCreatorInstructor user
  const instructorCreateBody = {
    tenant_id: systemAdminAuth.tenant_id,
    email: RandomGenerator.name(1).toLowerCase() + "@example.com",
    password_hash: "hashedpassword123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const instructorUser =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: instructorCreateBody,
    });
  typia.assert(instructorUser);

  const instructorLoginBody = {
    email: instructorCreateBody.email,
    password: "hashedpassword123",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const instructorAuth =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: instructorLoginBody,
    });
  typia.assert(instructorAuth);

  // 3. Create content with contentCreatorInstructor user
  connection.headers = { Authorization: instructorAuth.token.access };
  const contentBody = {
    tenant_id: instructorAuth.tenant_id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;
  const createdContent =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentBody,
      },
    );
  typia.assert(createdContent);

  // 4. List content versions using systemAdmin credentials
  connection.headers = { Authorization: systemAdminAuth.token.access };

  const listRequestBody = {
    search: null,
    page: 1,
    limit: 10,
    sort: "+created_at",
  } satisfies IEnterpriseLmsContentVersion.IRequest;

  const versionsList =
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
      connection,
      {
        contentId: createdContent.id,
        body: listRequestBody,
      },
    );
  typia.assert(versionsList);

  TestValidator.predicate(
    "pagination current page is 1",
    versionsList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    versionsList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    versionsList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    versionsList.pagination.pages > 0,
  );

  for (const version of versionsList.data) {
    TestValidator.equals(
      "contentId matches for each version",
      version.content_id,
      createdContent.id,
    );
    TestValidator.predicate("version_number >= 1", version.version_number >= 1);
  }

  // 5. Error case: invalid contentId
  await TestValidator.error(
    "should throw error for invalid contentId",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
        connection,
        {
          contentId: typia.random<string & tags.Format<"uuid">>(),
          body: listRequestBody,
        },
      );
    },
  );

  // 6. Error case: unauthorized access
  connection.headers = {};
  await TestValidator.error(
    "should throw error without authorization",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
        connection,
        {
          contentId: createdContent.id,
          body: listRequestBody,
        },
      );
    },
  );
}
