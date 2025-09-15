import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validate assigning a patient to an organization by a system admin.
 *
 * 1. Register system admin (system admin join)
 * 2. Register patient user (patient join)
 * 3. Login as system admin
 * 4. Create new organization
 * 5. Assign patient to organization (role_code = "patient")
 * 6. Confirm assignment properties
 * 7. Attempt duplicate assignment (should fail)
 * 8. Attempt invalid assignment (bad org/user ID) (should fail)
 */
export async function test_api_user_org_assignment_patient_to_organization(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = RandomGenerator.name(1) + "@enterprise-corp.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(adminJoin);

  // 2. Register patient
  const patientEmail = RandomGenerator.name(1) + "@patient.test";
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date(1985, 3, 10, 0, 0, 0, 0).toISOString(),
      password: patientPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(patientJoin);

  // 3. Login as system admin for all subsequent privileged actions
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });

  // 4. Create organization
  const orgCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const orgName = RandomGenerator.name(2) + " Medical Center";
  const orgStatus = "active";
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: orgStatus,
        },
      },
    );
  typia.assert(organization);

  // 5. Assign patient to organization as active "patient" role
  const userOrgAssignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: patientJoin.id,
          healthcare_platform_organization_id: organization.id,
          role_code: "patient",
          assignment_status: "active",
        },
      },
    );
  typia.assert(userOrgAssignment);
  TestValidator.equals(
    "assignment user ID matches patient",
    userOrgAssignment.user_id,
    patientJoin.id,
  );
  TestValidator.equals(
    "assignment org ID matches organization",
    userOrgAssignment.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "role code is patient",
    userOrgAssignment.role_code,
    "patient",
  );
  TestValidator.equals(
    "status is active",
    userOrgAssignment.assignment_status,
    "active",
  );

  // 6. Duplicate assignment should fail
  await TestValidator.error(
    "duplicate user-org assignment should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
        connection,
        {
          body: {
            user_id: patientJoin.id,
            healthcare_platform_organization_id: organization.id,
            role_code: "patient",
            assignment_status: "active",
          },
        },
      );
    },
  );

  // 7. Assignment to invalid org should fail
  await TestValidator.error("invalid org ID should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: patientJoin.id,
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role_code: "patient",
          assignment_status: "active",
        },
      },
    );
  });

  // 8. Assignment to invalid user should fail
  await TestValidator.error("invalid user ID should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          healthcare_platform_organization_id: organization.id,
          role_code: "patient",
          assignment_status: "active",
        },
      },
    );
  });
}
