import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate retrieving an org-department assignment by ID as a system admin.
 *
 * 1. Register a system admin with business email, legal full name, provider creds,
 *    and strong password.
 * 2. Login as the created system admin to obtain a fresh authorization context.
 * 3. Generate random UUIDs for organization and department IDs (since no
 *    org/department creation API in scope).
 * 4. Create an organization-department assignment linking the random org/dept IDs.
 * 5. Retrieve the assignment by its ID and verify deep equality of all returned
 *    fields.
 * 6. Error test: attempt to retrieve with a random non-existent UUID and expect
 *    runtime error.
 * 7. Error test: attempt to retrieve without authentication and confirm forbidden.
 * 8. Error test: attempt to retrieve with a syntactically invalid (not UUID) ID
 *    and expect error.
 */
export async function test_api_org_department_assignment_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinEmail = RandomGenerator.alphaNumeric(8) + "@enterprise-corp.com";
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinName = RandomGenerator.name();
  const joinResult: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: joinEmail,
        full_name: joinName,
        provider: "local",
        provider_key: joinEmail,
        password: joinPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(joinResult);

  // 2. Login as the system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinEmail,
      provider: "local",
      provider_key: joinEmail,
      password: joinPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Random UUIDs for org and department (no APIs to create entities)
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const deptId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create org-department assignment
  const createResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          healthcare_platform_department_id: deptId,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate,
      },
    );
  typia.assert(createResult);

  // 5. Retrieve the assignment and validate equality
  const readResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.at(
      connection,
      {
        orgDepartmentAssignmentId: createResult.id,
      },
    );
  typia.assert(readResult);
  TestValidator.equals(
    "assignment matches after retrieval",
    readResult,
    createResult,
  );

  // 6. Error: Retrieve with random non-existent UUID
  await TestValidator.error(
    "retrieving with non-existent id fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.at(
        connection,
        {
          orgDepartmentAssignmentId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );

  // 7. Error: Unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve assignment",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.at(
        unauthConn,
        {
          orgDepartmentAssignmentId: createResult.id,
        },
      );
    },
  );

  // 8. Error: Invalid ID format (not a UUID)
  await TestValidator.error("retrieving with non-uuid fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.at(
      connection,
      {
        orgDepartmentAssignmentId: RandomGenerator.alphaNumeric(12) as string &
          tags.Format<"uuid">,
      },
    );
  });
}
