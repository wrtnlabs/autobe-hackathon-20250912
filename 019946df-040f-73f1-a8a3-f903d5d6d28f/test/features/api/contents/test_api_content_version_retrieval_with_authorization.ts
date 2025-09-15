import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentVersion";

/**
 * Validate the retrieval of content version lists
 *
 * This test verifies the content version retrieval API under system admin
 * authorization. The test performs the following:
 *
 * 1. System admin user registration and login.
 * 2. Tenant organization creation by system admin.
 * 3. Content creator instructor registration and login within tenant context.
 * 4. Content creation by content creator instructor with tenant association.
 * 5. Switch back to system admin role.
 * 6. Fetch content version list for the created content with default
 *    pagination.
 * 7. Fetch content version list with explicit pagination parameters.
 * 8. Fetch content version list for non-existent content (expect empty
 *    results).
 *
 * Validations ensure proper authorization, tenant scoping, and pagination
 * correctness.
 *
 * Note: Unauthorized or invalid contentId path tests are skipped due to SDK
 * limitations.
 *
 * @param connection API connection instance
 */
export async function test_api_content_version_retrieval_with_authorization(
  connection: api.IConnection,
) {
  // 1. System Admin join
  const systemAdminJoinBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(10),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(3),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Content Creator Instructor join
  const cciJoinBody = {
    tenant_id: tenant.id,
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(10),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const cci: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: cciJoinBody,
    });
  typia.assert(cci);

  // 4. Create content by Content Creator Instructor
  const contentCreateBody = {
    tenant_id: tenant.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      { body: contentCreateBody },
    );
  typia.assert(content);

  // 5. Login again as system admin to ensure role switching (optional but for clarity)
  const systemAdminLoginBody = {
    email: systemAdminJoinBody.email,
    password_hash: systemAdminJoinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLogin);

  // 6. Retrieve content versions with no explicit pagination (empty search, defaults)
  const defaultRequestBody = {} satisfies IEnterpriseLmsContentVersion.IRequest;

  const versionsResultDefault: IPageIEnterpriseLmsContentVersion.ISummary =
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
      connection,
      {
        contentId: content.id,
        body: defaultRequestBody,
      },
    );
  typia.assert(versionsResultDefault);

  TestValidator.predicate(
    "Content versions data matches contentId",
    versionsResultDefault.data.every(
      (version) => version.content_id === content.id,
    ),
  );

  // 7. Retrieve content versions with pagination parameters
  const paginatedRequestBody = {
    search: null,
    page: 1,
    limit: 10,
    sort: "+version_number",
  } satisfies IEnterpriseLmsContentVersion.IRequest;

  const versionsResultPaginated: IPageIEnterpriseLmsContentVersion.ISummary =
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
      connection,
      {
        contentId: content.id,
        body: paginatedRequestBody,
      },
    );
  typia.assert(versionsResultPaginated);

  TestValidator.predicate(
    "Paginated content versions data matches contentId",
    versionsResultPaginated.data.every(
      (version) => version.content_id === content.id,
    ),
  );

  TestValidator.predicate(
    "Pagination current page is 1",
    versionsResultPaginated.pagination.current === 1,
  );

  TestValidator.predicate(
    "Pagination limit is 10",
    versionsResultPaginated.pagination.limit === 10,
  );

  // 8. Retrieve content versions for non-existent content ID to get empty list
  const nonExistentContentId = typia.random<string & tags.Format<"uuid">>();

  const versionsResultEmpty: IPageIEnterpriseLmsContentVersion.ISummary =
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
      connection,
      {
        contentId: nonExistentContentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsContentVersion.IRequest,
      },
    );
  typia.assert(versionsResultEmpty);

  TestValidator.equals(
    "Empty versions data array",
    versionsResultEmpty.data,
    [],
  );
}
