import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserOrgAssignment";

/**
 * End-to-end business flow for organization admin assignment and search
 * validation including boundary, filter, and negative testing.
 *
 * 1. System admin registers and creates a new organization.
 * 2. Organization admin registers and logs in against that organization.
 * 3. Onboards one or more receptionist users.
 * 4. Assigns the user(s) to the organization under test (e.g. as receptionist).
 * 5. Searches for assignments with no filters, with user filter, with org filter,
 *    with role filter, and with invalid IDs (boundary/negative case).
 * 6. Validates results only include permitted assignments, correct RBAC/role code,
 *    and pagination/sorting logic.
 * 7. Negative: Filters outside the orgAdmin's allowed context do not expose
 *    records.
 */
export async function test_api_user_org_assignment_indexing_organization_admin(
  connection: api.IConnection,
) {
  // 1. System admin registers
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: "sysadminpw", // test password
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);

  // 2. System admin creates a new organization
  const orgCode = RandomGenerator.alphaNumeric(10);
  const orgName = RandomGenerator.name();
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // 3. Organization admin registers and logs in
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "orgadminpw",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // Organization admin login just for context (token is already managed by join, but re-authenticate for realism)
  const orgAdminLogin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: "orgadminpw",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(orgAdminLogin);

  // 4. Receptionist user onboarding
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);

  // 5. Assign the receptionist to the organization as 'receptionist' role
  const assignment: IHealthcarePlatformUserOrgAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: receptionist.id,
          healthcare_platform_organization_id: organization.id,
          role_code: "receptionist",
          assignment_status: "active",
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // Assign a second user (staff) for pagination/role filter scenarios
  const staffEmail = typia.random<string & tags.Format<"email">>();
  const staff: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: staffEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(staff);
  const assignmentStaff: IHealthcarePlatformUserOrgAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: staff.id,
          healthcare_platform_organization_id: organization.id,
          role_code: "staff",
          assignment_status: "active",
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  typia.assert(assignmentStaff);

  // 6. Index/search with no filters (should find both assignments, paginated)
  let searchResult: IPageIHealthcarePlatformUserOrgAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          // no filters, default pagination
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "at least 2 assignments present after insert",
    searchResult.data.length >= 2,
  );
  // Pagination structure validation
  typia.assert(searchResult.pagination);

  // 7. Filter by user_id (receptionist)
  let filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          user_id: receptionist.id,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.predicate(
    "all found records user_id match receptionist user_id",
    filterResult.data.every((rec) => rec.user_id === receptionist.id),
  );

  // 8. Filter by organization_id
  filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          organization_id: organization.id,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.predicate(
    "all found records organization_id match",
    filterResult.data.every(
      (rec) => rec.healthcare_platform_organization_id === organization.id,
    ),
  );

  // 9. Filter by role_code staff
  filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          role_code: "staff",
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.predicate(
    "role_code filter gives only staff assignments",
    filterResult.data.every((rec) => rec.role_code === "staff"),
  );

  // 10. Pagination: limit=1, page=1
  filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          limit: 1 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.equals("pagination limit=1", filterResult.data.length, 1);

  // 11. Negative filter: random user_id not assigned to org
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          user_id: randomUserId,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.equals(
    "no records for nonexistent user_id",
    filterResult.data.length,
    0,
  );

  // 12. Negative filter: random organization_id the admin doesn't control
  const randomOrgId = typia.random<string & tags.Format<"uuid">>();
  filterResult =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.index(
      connection,
      {
        body: {
          organization_id: randomOrgId,
        } satisfies IHealthcarePlatformUserOrgAssignment.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.equals(
    "no records for random organization_id",
    filterResult.data.length,
    0,
  );
}
