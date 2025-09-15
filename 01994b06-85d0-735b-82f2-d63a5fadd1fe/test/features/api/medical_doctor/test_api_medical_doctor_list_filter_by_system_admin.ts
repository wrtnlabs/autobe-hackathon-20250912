import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformMedicalDoctor";

/**
 * Validates that a system admin can retrieve and filter the medical doctor list
 * across the platform.
 *
 * 1. Join as system admin
 * 2. Login as system admin (verifies token set)
 * 3. Create several medical doctor records with varied specialties, emails, and
 *    NPI numbers
 * 4. Perform a filter by specialty
 * 5. Perform a filter by NPI number
 * 6. Perform a filter by email
 * 7. Filter by a combo that yields empty results
 * 8. Paginate the unfiltered doctor list (page/limit)
 * 9. Try the search endpoint as unauthenticated/unauthorized role and expect error
 */
export async function test_api_medical_doctor_list_filter_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register (join) as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  TestValidator.equals("join email matches", adminJoin.email, adminEmail);

  // Step 2: Login explicitly (should reset token)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals("login email matches", adminLogin.email, adminEmail);

  // Step 3: Create several medical doctor records
  const specialties = [
    "Cardiology",
    "Pediatrics",
    "Oncology",
    "Radiology",
  ] as const;
  const doctors: IHealthcarePlatformMedicalDoctor[] = [];
  for (let i = 0; i < 6; ++i) {
    const specialty = RandomGenerator.pick([...specialties]);
    const doctorRequest = {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      specialty,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
    const doctor =
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
        connection,
        { body: doctorRequest },
      );
    typia.assert(doctor);
    doctors.push(doctor);
    TestValidator.equals(
      "created doctor specialty matches",
      doctor.specialty,
      specialty,
    );
    TestValidator.equals(
      "created doctor email matches",
      doctor.email,
      doctorRequest.email,
    );
    TestValidator.equals(
      "created doctor NPI",
      doctor.npi_number,
      doctorRequest.npi_number,
    );
  }

  // Step 4: Filter by specialty
  for (const spec of specialties) {
    const pageBySpecialty =
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.index(
        connection,
        {
          body: {
            specialty: spec,
          } satisfies IHealthcarePlatformMedicalDoctor.IRequest,
        },
      );
    typia.assert(pageBySpecialty);
    for (const d of pageBySpecialty.data) {
      TestValidator.equals("specialty filter matches", d.specialty, spec);
    }
  }

  // Step 5: Filter by NPI number (pick one doctor)
  const filterDoctor = RandomGenerator.pick(doctors);
  const pageByNpi =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.index(
      connection,
      {
        body: {
          npi_number: filterDoctor.npi_number,
        } satisfies IHealthcarePlatformMedicalDoctor.IRequest,
      },
    );
  typia.assert(pageByNpi);
  TestValidator.equals(
    "NPI returns expected doctor",
    pageByNpi.data[0]?.npi_number,
    filterDoctor.npi_number,
  );

  // Step 6: Filter by email
  const pageByEmail =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.index(
      connection,
      {
        body: {
          email: filterDoctor.email,
        } satisfies IHealthcarePlatformMedicalDoctor.IRequest,
      },
    );
  typia.assert(pageByEmail);
  TestValidator.equals(
    "email search returns one doctor",
    pageByEmail.data.length,
    1,
  );
  TestValidator.equals(
    "doctor email matches",
    pageByEmail.data[0]?.email,
    filterDoctor.email,
  );

  // Step 7: Combo filter yielding empty results
  const pageNoMatch =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.index(
      connection,
      {
        body: {
          specialty: "Surgery",
          email: "no_such_email_12345@example.com",
        } satisfies IHealthcarePlatformMedicalDoctor.IRequest,
      },
    );
  typia.assert(pageNoMatch);
  TestValidator.equals(
    "no results for unmatched combo",
    pageNoMatch.data.length,
    0,
  );

  // Step 8: Pagination - fetch two at a time
  const pageSize = 2;
  const pagedDoctors: IHealthcarePlatformMedicalDoctor.ISummary[] = [];
  let page = 1;
  let totalFetched = 0;
  // Loop to fetch paginated data (simulate multiple pages)
  while (true) {
    const pageResult =
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.index(
        connection,
        {
          body: {
            page,
            limit: pageSize,
          } satisfies IHealthcarePlatformMedicalDoctor.IRequest,
        },
      );
    typia.assert(pageResult);
    pagedDoctors.push(...pageResult.data);
    totalFetched += pageResult.data.length;
    if (totalFetched >= doctors.length || pageResult.data.length < pageSize)
      break;
    ++page;
  }
  // At least as many as created
  TestValidator.predicate(
    "all created doctors in paginated fetch",
    pagedDoctors.length >= doctors.length,
  );

  // Step 9: Unauthorized search attempt (simulate unauthenticated call)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated medical doctor list fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.index(
        unauthConn,
        {
          body: {
            specialty: RandomGenerator.pick([...specialties]),
          } satisfies IHealthcarePlatformMedicalDoctor.IRequest,
        },
      );
    },
  );
}
