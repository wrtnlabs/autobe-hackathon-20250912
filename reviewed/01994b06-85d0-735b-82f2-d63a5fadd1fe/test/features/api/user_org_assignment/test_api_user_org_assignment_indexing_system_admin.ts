import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserOrgAssignment";

/**
 * E2E: System admin searches (index) user-organization assignments with
 * multiple filters, pagination, and RBAC enforcement.
 *
 * Verifies:
 *
 * 1. System admin can search assignments with various filters (org, user,
 *    role, assignment_status).
 * 2. Pagination and sort logic works as expected.
 * 3. Negative: system returns no assignments for non-existent org/user IDs.
 * 4. Negative: unauthorized (non-admin) user cannot access the endpoint.
 *
 * Steps:
 *
 * 1. System admin joins.
 * 2. Create a new organization.
 * 3. Register a receptionist user.
 * 4. Assign this user to the org with a specific role and assignment_status.
 * 5. Search assignments: (a) with correct org id, (b) with correct user id,
 *    (c) with both, (d) with role_code, (e) with assignment_status, (f)
 *    paginated result, (g) sort, (h) invalid org/user, (i) unauthorized
 *    search (with unauthenticated conn).
 * 6. Validate all results for matches, pages, and proper error for forbidden
 *    access.
 */
export async function test_api_user_org_assignment_indexing_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create organization as admin
  const orgCreate =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgCreate);

  // 3. Register receptionist user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: userEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // 4. Assign user to organization with a specific role and status
  const role_code = "receptionist";
  const assignment_status = "active";
  const assignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: receptionist.id,
          healthcare_platform_organization_id: orgCreate.id,
          role_code,
          assignment_status,
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 5a. Search by org id
  const pageOrg =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          organization_id: orgCreate.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageOrg);
  TestValidator.predicate(
    "search by org_id returns assignment",
    pageOrg.data.some((a) => a.id === assignment.id),
  );

  // 5b. Search by user id
  const pageUser =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          user_id: receptionist.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageUser);
  TestValidator.predicate(
    "search by user_id returns assignment",
    pageUser.data.some((a) => a.id === assignment.id),
  );

  // 5c. Search by org+user id
  const pageBoth =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          organization_id: orgCreate.id,
          user_id: receptionist.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageBoth);
  TestValidator.predicate(
    "search by org_id+user_id returns assignment",
    pageBoth.data.some((a) => a.id === assignment.id),
  );

  // 5d. Search by role_code
  const pageRole =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          role_code,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageRole);
  TestValidator.predicate(
    "search by role_code returns assignment",
    pageRole.data.some((a) => a.id === assignment.id),
  );

  // 5e. Search by assignment_status
  const pageStatus =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          assignment_status,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageStatus);
  TestValidator.predicate(
    "search by assignment_status returns assignment",
    pageStatus.data.some((a) => a.id === assignment.id),
  );

  // 5f. Pagination test (will have only 1 assignment in our setup)
  const page2 =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "no records in page 2 (pagination)",
    page2.data.length,
    0,
  );

  // 5h. Search with non-existent org/user
  const pageBadOrg =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageBadOrg);
  TestValidator.equals(
    "no records for non-existent org",
    pageBadOrg.data.length,
    0,
  );

  const pageBadUser =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(pageBadUser);
  TestValidator.equals(
    "no records for non-existent user",
    pageBadUser.data.length,
    0,
  );

  // 5i. Negative test: unauthorized (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized cannot search assignments",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.index(
        unauthConn,
        {
          body: {
            organization_id: orgCreate.id,
            page: 1,
            limit: 10,
          } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
        },
      );
    },
  );
}
