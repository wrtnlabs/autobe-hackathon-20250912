import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollmentPrerequisite";

/**
 * Comprehensive end-to-end test for the enrollment prerequisite search
 * endpoint.
 *
 * This test ensures that systemAdmin users can authenticate, search enrollment
 * prerequisites with filtering and pagination, and receive correctly scoped
 * results according to tenant and enrollmentId.
 *
 * It also verifies unauthorized access leads to proper error handling.
 *
 * Workflow:
 *
 * 1. Register and login a systemAdmin user, obtaining tenant context.
 * 2. Use generated UUIDs to simulate searching prerequisites for an enrollment.
 * 3. Test positive response validations.
 * 4. Test unauthorized error.
 */
export async function test_api_enrollment_prerequisite_search(
  connection: api.IConnection,
) {
  // Step 1: System admin join
  const systemAdminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // Step 2: System admin login with registered email and password hash
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Use returned tenant_id and generate random enrollmentId
  const tenantId: string & tags.Format<"uuid"> = loggedInAdmin.tenant_id;
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Prepare request body for search with filter on enrollmentId, pagination
  const searchRequestBody = {
    page: 1,
    limit: 10,
    enrollment_id: enrollmentId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.IRequest;

  // Step 5: Call the search endpoint (PATCH)
  const searchResult: IPageIEnterpriseLmsEnrollmentPrerequisite.ISummary =
    await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.index(
      connection,
      {
        enrollmentId: enrollmentId,
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  // Step 6: Validate pagination info
  TestValidator.predicate(
    "pagination object should have current, limit, records, pages",
    searchResult.pagination !== null &&
      typeof searchResult.pagination === "object" &&
      typeof searchResult.pagination.current === "number" &&
      typeof searchResult.pagination.limit === "number" &&
      typeof searchResult.pagination.records === "number" &&
      typeof searchResult.pagination.pages === "number",
  );

  // Step 7: Validate returned data matches enrollmentId filter
  if (searchResult.data.length > 0) {
    for (const prereq of searchResult.data) {
      typia.assert(prereq);
      TestValidator.equals(
        "enrollment_id should match filter",
        prereq.enrollment_id,
        enrollmentId,
      );
      TestValidator.predicate(
        "prerequisite course id is not empty",
        typeof prereq.prerequisite_course_id === "string" &&
          prereq.prerequisite_course_id.length > 0,
      );
    }
  }

  // Step 8: Negative test unauthorized access
  // Create a connection with empty headers for unauthenticated call
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access should throw", async () => {
    await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.index(
      unauthenticatedConnection,
      {
        enrollmentId: enrollmentId,
        body: searchRequestBody,
      },
    );
  });
}
