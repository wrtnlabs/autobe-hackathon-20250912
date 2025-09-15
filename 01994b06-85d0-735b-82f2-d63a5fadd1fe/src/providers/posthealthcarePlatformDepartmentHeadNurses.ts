import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new nurse staff account in the healthcare_platform_nurses table.
 *
 * This operation allows a privileged department head to register a new nurse in
 * the healthcarePlatform system. It validates business rules (unique business
 * email, unique license number, optional specialty/phone), and inserts a new
 * record into the database. All date fields are returned as branded ISO8601
 * strings. No native Date type or 'as' casting is used at any point.
 * Optionals/nulls are handled strictly per schema:
 *
 * - Specialty, phone: omitted (undefined) if not provided
 * - Deleted_at: omitted if not present in DB (typical for active records)
 *   Business logic raises a precise error if email or license_number are
 *   already in use.
 *
 * @param props - The authenticated department head and nurse creation payload
 * @param props.departmentHead - DepartmentheadPayload for authorization context
 * @param props.body - New nurse profile data
 * @returns IHealthcarePlatformNurse with all fields populated, correctly typed
 * @throws {Error} If nurse email or license_number already exists
 */
export async function posthealthcarePlatformDepartmentHeadNurses(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformNurse.ICreate;
}): Promise<IHealthcarePlatformNurse> {
  const { departmentHead, body } = props;

  // Enforce email uniqueness (soft-deleted emails may be reused)
  const existingEmail =
    await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
      where: { email: body.email, deleted_at: null },
      select: { id: true },
    });
  if (existingEmail) {
    throw new Error("A nurse with this email already exists");
  }

  // Enforce license_number uniqueness (soft-deleted license_numbers may be reused)
  const existingLicense =
    await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
      where: { license_number: body.license_number, deleted_at: null },
      select: { id: true },
    });
  if (existingLicense) {
    throw new Error("A nurse with this license_number already exists");
  }

  // Timestamps (all dates handled as string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());

  // Create nurse record
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.create({
    data: {
      id: v4(),
      email: body.email,
      full_name: body.full_name,
      license_number: body.license_number,
      specialty: body.specialty ?? undefined,
      phone: body.phone ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  // Return API response with strict null/undefined optionals, no Date type
  return {
    id: nurse.id,
    email: nurse.email,
    full_name: nurse.full_name,
    license_number: nurse.license_number,
    specialty: nurse.specialty ?? undefined,
    phone: nurse.phone ?? undefined,
    created_at: nurse.created_at,
    updated_at: nurse.updated_at,
    deleted_at: nurse.deleted_at ?? undefined,
  };
}
