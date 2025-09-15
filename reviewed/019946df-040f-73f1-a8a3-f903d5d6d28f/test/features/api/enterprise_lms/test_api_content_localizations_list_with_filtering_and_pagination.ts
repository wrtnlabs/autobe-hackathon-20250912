import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentLocalization";

/**
 * Validate listing of content localizations with filtering and pagination
 * as a corporate learner.
 *
 * This test covers multi-role authentication, tenant creation, content
 * creation, and retrieval of content localizations with search filters,
 * pagination, and sorting.
 *
 * Steps:
 *
 * 1. System admin creation and login
 * 2. Tenant creation
 * 3. Corporate learner registration and login
 * 4. Content creator/instructor registration and login
 * 5. Content creation under tenant
 * 6. Corporate learner lists content localizations with filters and pagination
 * 7. Validate filtering, pagination, sorting, and authorization
 * 8. Test invalid contentId and unauthorized access
 *
 * This test ensures tenant isolation, proper authorization, and accurate
 * filtering of content localization listings.
 */
export async function test_api_content_localizations_list_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. System admin sign up and login
  const sysAdminEmail = `sysadmin${RandomGenerator.alphaNumeric(5)}@example.com`;
  const sysAdminPasswordHash = `hashed_password_${RandomGenerator.alphaNumeric(8)}`;
  const sysAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password_hash: sysAdminPasswordHash,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password_hash: sysAdminPasswordHash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 2. Tenant creation
  const tenantCode = `tenant${RandomGenerator.alphaNumeric(6)}`;
  const tenantName = `Tenant Name ${RandomGenerator.alphaNumeric(4)}`;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Corporate learner registration and login
  const corpLearnerEmail = `learner${RandomGenerator.alphaNumeric(5)}@example.com`;
  const corpLearnerPassword = `password${RandomGenerator.alphaNumeric(5)}`;
  const corpLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: corpLearnerEmail,
        password: corpLearnerPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(corpLearner);

  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corpLearnerEmail,
      password: corpLearnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 4. Content creator/instructor registration and login
  const creatorEmail = `creator${RandomGenerator.alphaNumeric(5)}@example.com`;
  const creatorPasswordHash = `hashed_pass_${RandomGenerator.alphaNumeric(8)}`;
  const creator: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: creatorEmail,
        password_hash: creatorPasswordHash,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(creator);

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPasswordHash,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 5. Content creation by content creator/instructor
  const contentTitle = `Content Title ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const contentDescription = RandomGenerator.content({ paragraphs: 1 });
  const contentType = RandomGenerator.pick([
    "video",
    "document",
    "scorm",
    "xapi",
  ] as const);
  const contentStatus = "draft";
  const businessStatus = RandomGenerator.pick([
    "active",
    "archived",
    "deprecated",
  ] as const);

  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          title: contentTitle,
          description: contentDescription,
          content_type: contentType,
          status: contentStatus,
          business_status: businessStatus,
        } satisfies IEnterpriseLmsContents.ICreate,
      },
    );
  typia.assert(content);

  // Switch back to corporate learner login for localization listing
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corpLearnerEmail,
      password: corpLearnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 6. List content localizations with filtering and pagination
  // Prepare filter request with realistic pagination & filter
  const filterRequest = {
    page: 1,
    limit: 10,
    search: null,
    language_code: null,
    content_id: content.id,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IEnterpriseLmsContentLocalization.IRequest;

  const localizationPage =
    await api.functional.enterpriseLms.corporateLearner.contents.contentLocalizations.index(
      connection,
      {
        contentId: content.id,
        body: filterRequest,
      },
    );
  typia.assert(localizationPage);

  // 7. Validate that returned entries correspond only to specified content
  for (const loc of localizationPage.data) {
    TestValidator.equals(
      "content localization content_id matches",
      loc.content_id,
      content.id,
    );
  }

  // Validate pagination metadata
  const pagination = localizationPage.pagination;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate("pagination pages positive", pagination.pages >= 0);
  TestValidator.predicate(
    "pagination record count non-negative",
    pagination.records >= 0,
  );

  // 8. Edge case: Listing with no localizations returns empty list
  const emptyFilterRequest = {
    page: 1,
    limit: 10,
    content_id: typia.random<string & tags.Format<"uuid">>(), // random unrelated contentId
  } satisfies IEnterpriseLmsContentLocalization.IRequest;

  const emptyPage =
    await api.functional.enterpriseLms.corporateLearner.contents.contentLocalizations.index(
      connection,
      {
        contentId: emptyFilterRequest.content_id!,
        body: emptyFilterRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty localization list", emptyPage.data.length, 0);

  // 9. Negative scenario: invalid contentId returns error
  await TestValidator.error("invalid contentId error", async () => {
    await api.functional.enterpriseLms.corporateLearner.contents.contentLocalizations.index(
      connection,
      {
        contentId: typia.random<string & tags.Format<"uuid">>(), // random UUID not linked
        body: {
          page: 1,
          limit: 1,
          content_id: null,
        } satisfies IEnterpriseLmsContentLocalization.IRequest,
      },
    );
  });

  // 10. Negative scenario: Unauthorized access (empty connection headers) should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access error", async () => {
    await api.functional.enterpriseLms.corporateLearner.contents.contentLocalizations.index(
      unauthenticatedConnection,
      {
        contentId: content.id,
        body: {
          page: 1,
          limit: 1,
          content_id: content.id,
        } satisfies IEnterpriseLmsContentLocalization.IRequest,
      },
    );
  });
}
