import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import type { IHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSessions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTelemedicineSessions";

/**
 * E2E validates organizationAdmin PATCH search/filter of telemedicine sessions.
 *
 * 1. Register & login as systemAdmin (tenant creation authority).
 * 2. Register & login as orgAdmin.
 * 3. SystemAdmin creates a new org (returns org.id).
 * 4. OrgAdmin creates 2 departments in org.
 * 5. Register & login 2 medicalDoctors (providers), assign to org context.
 * 6. Register & login 2 patients.
 * 7. OrgAdmin creates 4 appointments (varied dept/provider/patient).
 * 8. OrgAdmin creates 4 telemedicine sessions (for the appointments).
 * 9. OrgAdmin does PATCH search/query:
 *
 * - Default (no filter): all 4 sessions visible (paginated, organization scope
 *   only).
 * - By department: returns sessions matching department.
 * - By provider_user_id: returns sessions for given provider.
 * - By patient_user_id: returns sessions for given patient.
 * - Combination filters: matches intersection.
 * - Pagination: test limit/page.
 * - Out-of-scope orgId: zero sessions visible.
 * - Non-existent provider/patient: zero sessions visible.
 *
 * 10. Test RBAC by registering/logging in as another orgAdmin for a different org,
 *     then PATCH search for "wrong" org's sessions (should see none).
 */
export async function test_api_telemed_sessions_org_admin_advanced_search_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register and login as systemAdmin
  const sysAdminEmail = `${RandomGenerator.alphabets(7)}@enterprise-corp.com`;
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);

  // 2. Register and login as orgAdmin
  const orgAdminEmail = `${RandomGenerator.alphabets(8)}@org.com`;
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdmin);

  // 3. SystemAdmin creates a new org
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  const orgCode = RandomGenerator.alphaNumeric(6);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(3),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 4. OrgAdmin login & creates 2 departments in org
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  const dept1 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: `DEPT${RandomGenerator.alphaNumeric(2).toUpperCase()}`,
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(dept1);
  const dept2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: `DEPT${RandomGenerator.alphaNumeric(2).toUpperCase()}`,
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(dept2);

  // 5. Register/login 2 medical doctors
  const providerAEmail = `${RandomGenerator.alphabets(8)}@md.com`;
  const providerAPassword = RandomGenerator.alphaNumeric(12);
  const providerA = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: providerAEmail,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: providerAPassword as string & tags.Format<"password">,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(providerA);

  const providerBEmail = `${RandomGenerator.alphabets(8)}@md.com`;
  const providerBPassword = RandomGenerator.alphaNumeric(12);
  const providerB = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: providerBEmail,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: providerBPassword as string & tags.Format<"password">,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(providerB);

  // 6. Register/login 2 patients
  const patientAEmail = `${RandomGenerator.alphabets(7)}@pt.com`;
  const patientAPassword = RandomGenerator.alphaNumeric(10);
  const patientA = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientAEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date(
        1990,
        1 + Math.floor(Math.random() * 12),
        1 + Math.floor(Math.random() * 28),
      ).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientAPassword,
    },
  });
  typia.assert(patientA);

  const patientBEmail = `${RandomGenerator.alphabets(7)}@pt.com`;
  const patientBPassword = RandomGenerator.alphaNumeric(10);
  const patientB = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientBEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date(
        1992,
        1 + Math.floor(Math.random() * 12),
        1 + Math.floor(Math.random() * 28),
      ).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientBPassword,
    },
  });
  typia.assert(patientB);

  // 7. OrgAdmin creates 4 appointments
  const appts: IHealthcarePlatformAppointment[] = [];
  const deptIds = [dept1.id, dept2.id];
  const providerIds = [providerA.id, providerB.id];
  const patientIds = [patientA.id, patientB.id];

  for (let i = 0; i < 4; ++i) {
    const appt =
      await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            healthcare_platform_department_id: deptIds[i % 2],
            provider_id: providerIds[i % 2],
            patient_id: patientIds[i % 2],
            status_id: typia.random<string & tags.Format<"uuid">>(),
            appointment_type: "telemedicine",
            start_time: new Date(
              Date.now() + 1000 * 60 * 30 * (i + 1),
            ).toISOString(),
            end_time: new Date(
              Date.now() + 1000 * 60 * 30 * (i + 2),
            ).toISOString(),
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
          },
        },
      );
    typia.assert(appt);
    appts.push(appt);
  }

  // 8. OrgAdmin creates 4 telemedicine sessions for those appointments
  const sessions: IHealthcarePlatformTelemedicineSession[] = [];
  for (const appt of appts) {
    const session =
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
        connection,
        {
          body: {
            appointment_id: appt.id,
            join_link: `https://telemed/${RandomGenerator.alphaNumeric(10)}`,
            session_start: appt.start_time,
            session_end: appt.end_time,
            session_recorded: Math.random() > 0.5,
          },
        },
      );
    typia.assert(session);
    sessions.push(session);
  }

  // 9. OrgAdmin does PATCH search/query for sessions
  // - Default (no filter): all sessions visible
  const allPage =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
      connection,
      { body: {} },
    );
  typia.assert(allPage);
  TestValidator.equals("expect 4 sessions", allPage.data.length, 4);

  // - Filter by department
  for (const dept of [dept1, dept2]) {
    const pageByDept =
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
        connection,
        {
          body: { department_id: dept.id },
        },
      );
    typia.assert(pageByDept);
    TestValidator.predicate(
      `all sessions filtered by department: ${dept.id}`,
      pageByDept.data.every((session) => {
        const appt = appts.find((a) => a.id === session.appointment_id);
        return appt && appt.healthcare_platform_department_id === dept.id;
      }),
    );
  }

  // - Filter by provider
  for (const provider of [providerA, providerB]) {
    const pageByProvider =
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
        connection,
        {
          body: { provider_user_id: provider.id },
        },
      );
    typia.assert(pageByProvider);
    TestValidator.predicate(
      `all sessions filtered by provider ${provider.id}`,
      pageByProvider.data.every((session) => {
        const appt = appts.find((a) => a.id === session.appointment_id);
        return appt && appt.provider_id === provider.id;
      }),
    );
  }

  // - Filter by patient
  for (const patient of [patientA, patientB]) {
    const pageByPatient =
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
        connection,
        {
          body: { patient_user_id: patient.id },
        },
      );
    typia.assert(pageByPatient);
    TestValidator.predicate(
      `all sessions filtered by patient ${patient.id}`,
      pageByPatient.data.every((session) => {
        const appt = appts.find((a) => a.id === session.appointment_id);
        return appt && appt.patient_id === patient.id;
      }),
    );
  }

  // - Combination filter: dept + provider
  const combPage =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
      connection,
      {
        body: { department_id: dept1.id, provider_user_id: providerA.id },
      },
    );
  typia.assert(combPage);
  TestValidator.predicate(
    `Combo filter dept+provider`,
    combPage.data.every((session) => {
      const appt = appts.find((a) => a.id === session.appointment_id);
      return (
        appt &&
        appt.healthcare_platform_department_id === dept1.id &&
        appt.provider_id === providerA.id
      );
    }),
  );

  // - Pagination check
  const paged =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
      connection,
      {
        body: { limit: 2, page: 1 },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination limit=2", paged.data.length, 2);

  // - OrgId filter (should be ignored, only results for own org)
  const wrongOrgPage =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
      connection,
      {
        body: { organization_id: typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(wrongOrgPage);
  TestValidator.equals(
    "wrong org yields empty sessions",
    wrongOrgPage.data.length,
    0,
  );

  // - Non-existent provider/patient
  for (const fakeId of [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ]) {
    const fakeProvPage =
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
        connection,
        {
          body: { provider_user_id: fakeId },
        },
      );
    typia.assert(fakeProvPage);
    TestValidator.equals(
      "nonexistent provider yields empty",
      fakeProvPage.data.length,
      0,
    );
    const fakePatPage =
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
        connection,
        {
          body: { patient_user_id: fakeId },
        },
      );
    typia.assert(fakePatPage);
    TestValidator.equals(
      "nonexistent patient yields empty",
      fakePatPage.data.length,
      0,
    );
  }

  // 10. RBAC test: register new org, new admin, ensure RBAC blocks cross-org
  const org2AdminEmail = `${RandomGenerator.alphabets(9)}@org2.com`;
  const org2AdminPassword = RandomGenerator.alphaNumeric(11);
  const org2Admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: org2AdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: org2AdminPassword,
      },
    },
  );
  typia.assert(org2Admin);
  // SystemAdmin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  // create new org
  const organization2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(3),
          status: "active",
        },
      },
    );
  typia.assert(organization2);
  // login as org2admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: org2AdminEmail,
      password: org2AdminPassword,
    },
  });
  // organization admin should see 0 sessions when querying for all sessions
  const crossOrgSessions =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(crossOrgSessions);
  TestValidator.equals(
    "cross-org query returns nothing",
    crossOrgSessions.data.length,
    0,
  );
}
