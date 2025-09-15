import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollmentPrerequisite";

export async function test_api_enrollment_prerequisite_search_for_organization_admin(
  connection: api.IConnection,
) {
  // 1. Create organizationAdmin user and authenticate (join)
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const joinRequest = {
    tenant_id: tenantId,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: "ValidPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(orgAdmin);
  TestValidator.equals(
    "tenant_id matches on join",
    orgAdmin.tenant_id,
    tenantId,
  );

  // 2. Execute login for organizationAdmin
  const loginRequest = {
    email: joinRequest.email,
    password: joinRequest.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loginAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginRequest,
    });
  typia.assert(loginAuth);
  TestValidator.equals(
    "tenant_id matches on login",
    loginAuth.tenant_id,
    tenantId,
  );

  // 3. Prepare data: multiple enrollment prerequisite records for search
  // We simulate multiple IEnterpriseLmsEnrollmentPrerequisite.ISummary records,
  // but since there's no create API exposed in SDK, we only generate random entries.

  // For testing backend filtering and pagination, generate prerequisites
  const ENTRIES_COUNT = 30;
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();
  const prerequisiteCourseIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Select a prerequisiteCourseId to filter after
  const filterPrerequisiteCourseId = RandomGenerator.pick(
    prerequisiteCourseIds,
  );

  // We perform a search using filtering by enrollment_id, prerequisite_course_id,
  // page, limit, and sorting.
  const page = 1;
  const limit = 10;

  // 4. Formulate search request body with filters
  const searchRequest = {
    page,
    limit,
    enrollment_id: enrollmentId,
    prerequisite_course_id: filterPrerequisiteCourseId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.IRequest;

  // 5. Call the API endpoint
  const response: IPageIEnterpriseLmsEnrollmentPrerequisite.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.index(
      connection,
      {
        enrollmentId,
        body: searchRequest,
      },
    );
  typia.assert(response);

  // 6. Validate response structure: pagination object
  TestValidator.predicate(
    "pagination current page match",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit match",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages positive",
    response.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );

  // 7. Validate items reflect filters
  TestValidator.predicate(
    "items count less or equal to limit",
    response.data.length <= limit,
  );
  for (const item of response.data) {
    TestValidator.equals(
      "item enrollment_id matches filter",
      item.enrollment_id,
      enrollmentId,
    );
    TestValidator.equals(
      "item prerequisite_course_id matches filter",
      item.prerequisite_course_id,
      filterPrerequisiteCourseId,
    );
  }
}
