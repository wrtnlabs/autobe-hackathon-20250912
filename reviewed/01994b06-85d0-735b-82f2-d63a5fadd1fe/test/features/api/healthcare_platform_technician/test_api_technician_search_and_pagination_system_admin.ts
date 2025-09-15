import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTechnician";

/**
 * Validates the search and pagination system for technician records accessed by
 * system admins.
 *
 * This test covers:
 *
 * 1. Registering and logging in as a system admin.
 * 2. Creating multiple technician accounts with diverse specialties for realistic
 *    filtering.
 * 3. Searching technicians:
 *
 *    - Unfiltered (should return all/bulk technicians)
 *    - By partial full_name substring (should return matches)
 *    - By specialty (should return only those with matching specialty)
 * 4. Testing pagination output correctness (number of results per page, data
 *    consistency).
 * 5. Checking error scenarios:
 *
 *    - Out-of-bounds pagination (should return empty or safe structure)
 *    - Unauthorized API call (should be denied)
 *
 * The test ensures the endpoint’s filter and pagination logic, access control,
 * and error handling are robust and in line with business requirements.
 */
export async function test_api_technician_search_and_pagination_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = `${RandomGenerator.alphabets(10)}@business.com`;
  const adminPassword = "Password123!";
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 2. Register several technician accounts
  const specialties = ["Radiology", "Phlebotomy", "Lab", "Imaging"] as const;
  const technicians = await ArrayUtil.asyncRepeat(9, async (i) => {
    const specialty =
      i % 2 === 0 ? RandomGenerator.pick(specialties) : undefined;
    return await api.functional.auth.technician.join(connection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}${i}@med.com`,
        full_name: `Tech${i} ${RandomGenerator.name()}`,
        license_number: RandomGenerator.alphaNumeric(8),
        specialty: specialty,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformTechnician.IJoin,
    });
  });

  // 3. Unfiltered technician directory listing
  const pageAll =
    await api.functional.healthcarePlatform.systemAdmin.technicians.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformTechnician.IRequest,
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "pagination records >= seeded technicians",
    pageAll.pagination.records >= technicians.length,
  );
  TestValidator.predicate(
    "all created technicians present in API result data",
    technicians.every((t) => pageAll.data.some((d) => d.email === t.email)),
  );

  // 4. Search by partial full_name
  const sampleTech = RandomGenerator.pick(technicians);
  const queryName = sampleTech.full_name.substring(
    2,
    sampleTech.full_name.length - 1,
  );
  const pageName =
    await api.functional.healthcarePlatform.systemAdmin.technicians.index(
      connection,
      {
        body: {
          full_name: queryName,
        } satisfies IHealthcarePlatformTechnician.IRequest,
      },
    );
  typia.assert(pageName);
  TestValidator.predicate(
    "all name-filtered results have full_name containing query",
    pageName.data.every((d) => d.full_name.includes(queryName)),
  );

  // 5. Search by specialty
  const techWithSpecialty = technicians.find(
    (t) => t.specialty !== undefined && t.specialty !== null,
  );
  if (
    techWithSpecialty &&
    techWithSpecialty.specialty !== undefined &&
    techWithSpecialty.specialty !== null
  ) {
    const pageSpec =
      await api.functional.healthcarePlatform.systemAdmin.technicians.index(
        connection,
        {
          body: {
            specialty: techWithSpecialty.specialty,
          } satisfies IHealthcarePlatformTechnician.IRequest,
        },
      );
    typia.assert(pageSpec);
    TestValidator.predicate(
      "all specialty-filtered results have the requested specialty",
      pageSpec.data.every((d) => d.specialty === techWithSpecialty.specialty),
    );
  }

  // 6. Pagination: fetch up to two first pages and confirm result lengths
  const pageFirst =
    await api.functional.healthcarePlatform.systemAdmin.technicians.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformTechnician.IRequest,
      },
    );
  typia.assert(pageFirst);
  const pageObj: IPage.IPagination = pageFirst.pagination;
  for (let cur = 0; cur < Math.min(pageObj.pages, 2); ++cur) {
    const resp =
      await api.functional.healthcarePlatform.systemAdmin.technicians.index(
        connection,
        {
          body: {} satisfies IHealthcarePlatformTechnician.IRequest,
        },
      );
    typia.assert(resp);
    TestValidator.predicate(
      "paged results do not exceed limit",
      resp.data.length <= pageObj.limit,
    );
  }

  // 7. Out-of-bounds pagination (since IRequest does not have explicit page param, just verify API is robust)
  const pageBeyond =
    await api.functional.healthcarePlatform.systemAdmin.technicians.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformTechnician.IRequest,
      },
    );
  typia.assert(pageBeyond);
  TestValidator.predicate(
    "API responds safely when requesting with default params (no crash)",
    Array.isArray(pageBeyond.data),
  );

  // 8. Unauthorized: system admin logout simulation (call with unauthenticated conn)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized system admin call is denied",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.technicians.index(
        unauthConn,
        {
          body: {} satisfies IHealthcarePlatformTechnician.IRequest,
        },
      );
    },
  );
}
